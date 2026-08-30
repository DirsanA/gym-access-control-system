import { HydratedDocument, InferSchemaType, Schema, model } from "mongoose";

const memberSchema = new Schema(
  {
    memberId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^GYM-\d{6,}$/, "Member ID must use the GYM-000001 format"],
    },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    profileImage: { type: String, trim: true, maxlength: 1_000 },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] },
    dateOfBirth: { type: Date },
    membershipPlan: { type: String, required: true, trim: true, maxlength: 80 },
    membershipStartDate: { type: Date, required: true },
    membershipEndDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

memberSchema.index({ fullName: 1 });
memberSchema.index({ phone: 1 });
memberSchema.index({ membershipEndDate: 1 });

export type Member = InferSchemaType<typeof memberSchema>;
export type MemberDocument = HydratedDocument<Member>;
export const MemberModel = model<Member>("Member", memberSchema);
