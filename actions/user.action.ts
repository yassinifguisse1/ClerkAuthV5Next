"use server";
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
interface UserDataType {
  clerkId: string;
  email: string;
  username: string;
  photo: string;
  firstName: string;
  lastName: string;
}
export async function createUser(user: User) {
  try {
    await connect();
    const newUser = await User.create(user);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.log(error);
  }
}


export async function updateUser(clerkId: string, userData: User) {
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