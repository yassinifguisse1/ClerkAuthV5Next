import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { createUser, updateUser } from "@/actions/user.action";
import { NextResponse } from "next/server";

interface User {
  clerkId: string;
  email: string;
  username: string;
  photo: string;
  firstName?: string;
  lastName?: string;
}

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Do something with the payload
  // For this guide, you simply log the payload to the console
  const { id } = evt.data;
  const eventType = evt.type;

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const {
        id,
        email_addresses,
        image_url,
        first_name,
        last_name,
        username,
      } = evt.data;

      const user: User = {
        clerkId: id,
        email: email_addresses[0].email_address,
        username: username!,
        photo: image_url!,
        firstName: first_name!,
        lastName: last_name!,
      };
      if (eventType === "user.created") {
        const newUser = await createUser(user);
        if (newUser) {
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
              userId: newUser._id,
            },
          });
        }
        return NextResponse.json({
          message: "New user created",
          user: newUser,
        });
      } else if (eventType === "user.updated") {
        const updatedUser = await updateUser(id, user);
        if (updatedUser) {
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
              userId: updatedUser._id,
            },
          });
        }
        return NextResponse.json({
          message: "User updated",
          user,
        });
      }

      return NextResponse.json({ message: "User updated", user });
    } else {
      console.log(`Unhandled event type: ${eventType}`);
      return new Response("Unhandled event type", { status: 400 });
    }
  } catch (error) {
    console.error("Error handling event:", error);
    return new Response("Error occured", { status: 500 });
  }

  // return new Response("", { status: 200 });
}
