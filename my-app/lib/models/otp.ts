import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  resendAvailableAt: Date;
  // Pending registration data stored securely until OTP is successfully validated
  registrationData?: {
    username: string;
    fullName: string;
    phone: string;
    gender?: string;
    passwordHash: string;
  };
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically remove document when expired
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    registrationData: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const Otp: Model<IOtp> = mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema);
