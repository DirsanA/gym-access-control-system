import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";

async function createAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || "Gym Administrator";

  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before running this command.");
  }

  await connectDatabase(env.mongoUri);
  await UserModel.findOneAndUpdate(
    { email },
    { $set: { fullName, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN" } },
    { new: true, upsert: true }
  ).exec();
  console.log(`Admin account ready for ${email}.`);
}

createAdmin()
  .catch((error: unknown) => {
    console.error("Unable to create admin", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
