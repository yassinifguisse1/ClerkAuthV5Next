import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient, UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { createUser, deleteUser, updateUser } from "@/actions/user.action";
import { NextResponse } from "next/server";
import User from "@/modals/user.modal";
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
    return new Response("Error occurred -- no svix headers", {
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
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Do something with the payload
  const { id } = evt.data;
  const eventType = evt.type as string;

  // console.log(`Handling event: ${eventType} for user ID: ${id}`);
  // const {
  //   id,
  //   email_addresses,
  //   image_url,
  //   first_name,
  //   last_name,
  //   username,
  // } = evt.data as UserJSON;

  // const user: User = {
  //   clerkId: id as string,
  //   email: email_addresses ? email_addresses[0].email_address : "",
  //   username: username || "",
  //   photo: image_url || "",
  //   firstName: first_name || "",
  //   lastName: last_name || "",
  // };
  try {
    if (eventType === "user.created") {
      // Handle user creation
      const {
        email_addresses,
        image_url,
        first_name,
        last_name,
        username,
      } = evt.data as UserJSON;

      const newUser = {
        clerkId: id as string,
        email: email_addresses ? email_addresses[0].email_address : "",
        username: username || "",
        photo: image_url || "",
        firstName: first_name || "",
        lastName: last_name || "",
      };

      await User.create(newUser);
      console.log(`User with ID ${id} created in MongoDB.`);
    } else if (eventType === "user.updated") {
      // Handle user update
      const {
        email_addresses,
        image_url,
        first_name,
        last_name,
        username,
      } = evt.data as UserJSON;

      const updatedUser = {
        clerkId: id as string,
        email: email_addresses ? email_addresses[0].email_address : "",
        username: username || "",
        photo: image_url || "",
        firstName: first_name || "",
        lastName: last_name || "",
      };

      await User.findOneAndUpdate(
        { clerkId: id },
        updatedUser,
        { new: true, upsert: true }
      );

      console.log(`User with ID ${id} updated in MongoDB.`);
    } else if (eventType === "user.deleted") {
      // Handle user deletion
      await User.findOneAndDelete({ clerkId: id });
      console.log(`User with ID ${id} deleted from MongoDB.`);
    } else {
      console.log(`Unhandled event type: ${eventType}`);
      return NextResponse.json({ message: "Unhandled event type" }, { status: 400 });
    }

    return NextResponse.json({ message: "Webhook handled successfully" });
  } catch (error) {
    console.error("Error handling event:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }

}
