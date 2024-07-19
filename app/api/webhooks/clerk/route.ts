import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient, UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { createUser, deleteUser, updateUser } from "@/actions/user.action";
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
  const eventType = evt.type as string;

  try {
    if (eventType === "user.created" || eventType === "user.updated" || eventType === "user.deleted") {
      const {
        id,
        email_addresses,
        image_url,
        first_name,
        last_name,
        username,
      } = evt.data as UserJSON;

      const user: User = {
        clerkId: id as string,
        email: email_addresses ? email_addresses[0].email_address : "",
        username: username || "",
        photo: image_url || "",
        firstName: first_name || "",
        lastName: last_name || "",
      };
      if (eventType === "user.created") {
        // create new user
        const newUser = await createUser(user as typeof newUser );
        // create metadata
        if (newUser) {
          await clerkClient.users.updateUserMetadata(id as string, {
            publicMetadata: {
              userId: newUser._id,
            },
          });
        }
        // response
        return NextResponse.json({
          message: "New user created",
          user,
        });
      } 
      else if (eventType === "user.updated") {
        // update the user bu usinf Id
        const updatedUser = await updateUser(id as string, user);
        // update metadata
        if (updatedUser) {
          await clerkClient.users.updateUserMetadata(id as string, {
            publicMetadata: {
              userId: updatedUser._id,
            },
          });
        }
        // response
        return NextResponse.json({ message: "User updated", user : updateUser});
      }
    } else if (eventType === "user.deleted") {
      // Assuming `deleteUser` is implemented in user.action.ts
      const deletedUser = await deleteUser(id as string) ;
      console.log(id)
      // response
      return NextResponse.json({ message: "User delete " , user: deletedUser });
    }
    else {
      return new Response(`Unhandled event typeeee ${eventType}` , { status: 400 });
    }
  } catch (error) {
    console.error("Error handling event:", error);
    return new Response("Error occured", { status: 500 });
  }
  return new Response("", { status: 200 });
}
