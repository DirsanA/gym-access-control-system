import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import { MemberModel } from "../models/member.model";
import { parseDateOnly } from "../utils/date";

async function seed(): Promise<void> {
  await connectDatabase(env.mongoUri);

  await MemberModel.updateOne(
    { memberId: "GYM-000123" },
    {
      $set: {
        fullName: "John Doe",
        phone: "+254 700 000 123",
        email: "john.doe@example.com",
        membershipPlan: "Premium",
        membershipStartDate: parseDateOnly("2026-08-01"),
        membershipEndDate: parseDateOnly("2026-12-31"),
        isActive: true,
      },
      $setOnInsert: { memberId: "GYM-000123" },
    },
    { upsert: true }
  );

  await MemberModel.updateOne(
    { memberId: "GYM-000124" },
    {
      $set: {
        fullName: "Sara Ali",
        phone: "+254 700 000 124",
        email: "sara.ali@example.com",
        membershipPlan: "Basic",
        membershipStartDate: parseDateOnly("2026-06-01"),
        membershipEndDate: parseDateOnly("2026-08-25"),
        isActive: true,
      },
      $setOnInsert: { memberId: "GYM-000124" },
    },
    { upsert: true }
  );

  console.log("Seeded GYM-000123 (active) and GYM-000124 (expired).");
}

seed()
  .catch((error: unknown) => {
    console.error("Unable to seed demo members", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
