import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  phone: string;
  fullName?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  passwordHash: string;
  role: "customer" | "admin";
  isVerified: boolean;
  isSuspended: boolean;
  memberId?: string; // GYM-000123 format when member pass or subscription is granted
  photoUrl?: string; // Member portrait face photo for turnstile/cashier verification
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    memberId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance search and pagination indexes
UserSchema.index({ phone: 1 });
UserSchema.index({ fullName: 1 });
UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ role: 1, isVerified: 1 });
UserSchema.index({ role: 1, isSuspended: 1 });
UserSchema.index({ role: 1, memberId: 1 });
UserSchema.index({ createdAt: -1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
