import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  planId?: mongoose.Types.ObjectId;
  amountETB: number;
  currency: string;
  provider: "CHAPA" | "CASH";
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  txRef: string; // Unique transaction reference
  chapaCheckoutUrl?: string;
  chapaReference?: string;
  confirmedByAdminId?: mongoose.Types.ObjectId; // For cash payments
  adminNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
    },
    amountETB: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "ETB",
    },
    provider: {
      type: String,
      enum: ["CHAPA", "CASH"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    txRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    chapaCheckoutUrl: {
      type: String,
    },
    chapaReference: {
      type: String,
    },
    confirmedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
