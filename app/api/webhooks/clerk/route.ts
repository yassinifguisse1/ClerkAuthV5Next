import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient, UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { createUser, deleteUser, updateUser } from "@/actions/user.action";
import { NextResponse } from "next/server";
import { connect } from "@/db";

interface User {
  clerkId: string;
  email: string;
  username: string;
  photo: string;
  firstName?: string;
  lastName?: string;
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Error occurred -- no svix headers" },
      { status: 400 }
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json({ error: "Error occurred" }, { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type as string;

  try {
    await connect();

    if (eventType === "user.created" || eventType === "user.updated" || eventType === "user.deleted") {
      const { email_addresses, image_url, first_name, last_name, username } = evt.data as UserJSON;

      const user: User = {
        clerkId: id as string,
        email: email_addresses ? email_addresses[0].email_address : "",
        username: username || "",
        photo: image_url || "",
        firstName: first_name || "",
        lastName: last_name || "",
      };

      if (eventType === "user.created") {
        const newUser = await createUser(user as any);
        if (newUser) {
          await clerkClient.users.updateUserMetadata(id as string, {
            publicMetadata: {
              userId: newUser._id,
            },
          });
        }
        return NextResponse.json({ message: "New user created", user: newUser });
      } else if (eventType === "user.updated") {
        const updatedUser = await updateUser(id as string, user);
        if (updatedUser) {
          await clerkClient.users.updateUserMetadata(id as string, {
            publicMetadata: {
              userId: updatedUser._id,
            },
          });
        }
        return NextResponse.json({ message: "User updated", user: updatedUser });
      } else if (eventType === "user.deleted") {
        await deleteUser(id as string);
        return NextResponse.json({ message: "User deleted" });
      }
    } else {
      console.log(`Unhandled event type: ${eventType}`);
      return new Response(`Unhandled event type: ${eventType}`, { status: 400 });
    }
  } catch (error) {
    console.error("Error handling event:", error);
    return NextResponse.json({ error: "Error occurred" }, { status: 500 });
  }
}