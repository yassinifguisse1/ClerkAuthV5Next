"use server";
import User from "@/modals/user.modal";
import { connect } from "@/db";

interface UserUpdateData {
  email?: string;
  username?: string;
  photo?: string;
  firstName?: string;
  lastName?: string;
}
export async function createUser(user: typeof User) {
  try {
    await connect();
    const newUser = await User.create(user);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.log(error);
  }
}


export async function updateUser(clerkId: string, userData: UserUpdateData) {
  try {
    await connect();
    const updatedUser = await User.findOneAndUpdate({ clerkId }, userData, {
      new: true,
    });

    if (!updatedUser) {
      throw new Error(`User with clerkId ${clerkId} not found`);
    }
    
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    console.error(error);
    throw new Error("Error updating user");
  }
}

export async function deleteUser(clerkId: string) {
  try {
    await connect(); // Ensure the database connection is established
    if (!clerkId) {
      throw new Error("Invalid clerkId provided");
    }
    // Find and delete the user
    const deletedUser = await User.findOneAndDelete({ clerkId });

    if (!deletedUser) {
      throw new Error(`User with clerkId ${clerkId} not found`);
    }
    

    return { message: `User with clerkId ${clerkId} deleted` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Error deleting user");
  }
}