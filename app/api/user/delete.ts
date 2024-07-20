import { NextApiRequest, NextApiResponse } from "next";
import { auth, clerkClient } from "@clerk/nextjs/server";
import User from "../../../modals/user.modal";
import { connect } from "../../../db";
import { NextResponse } from "next/server";
export async function DELETE() {
    const { userId } = auth();
  
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  
    try {
      // Connect to MongoDB
      await connect();
  
      // Delete user from Clerk
      await clerkClient.users.deleteUser(userId);
  
      // Delete user from MongoDB
      const deletedUser = await User.findOneAndDelete({ clerkId: userId });
  
      if (!deletedUser) {
        return NextResponse.json({ message: "User not found in MongoDB" }, { status: 404 });
      }
  
      return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
  }
