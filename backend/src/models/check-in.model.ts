import { InferSchemaType, Schema, model } from "mongoose";

const checkInSchema = new Schema(
  {
    member: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    memberId: { type: String, required: true, trim: true, uppercase: true },
    scannedAt: { type: Date, required: true, default: Date.now },
    result: { type: String, enum: ["SUCCESS", "EXPIRED", "NOT_FOUND"], required: true },
    membershipStatus: { type: String, enum: ["ACTIVE", "EXPIRED", "NOT_FOUND"], required: true },
  },
  { timestamps: true }
);

checkInSchema.index({ memberId: 1, createdAt: -1 });
checkInSchema.index({ scannedAt: -1 });

export type CheckIn = InferSchemaType<typeof checkInSchema>;
export const CheckInModel = model<CheckIn>("CheckIn", checkInSchema);
