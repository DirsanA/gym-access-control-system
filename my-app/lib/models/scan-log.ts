import mongoose, { Document, Model, Schema } from "mongoose";

export interface IScanLog extends Document {
  ticketId?: mongoose.Types.ObjectId;
  memberId: string;
  scannerId: string;
  result: "SUCCESS" | "EXPIRED" | "NOT_FOUND" | "SUSPENDED" | "REVOKED";
  message: string;
  scannedAt: Date;
  metadata?: Record<string, any>;
}

const ScanLogSchema = new Schema<IScanLog>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
    },
    memberId: {
      type: String,
      required: true,
      index: true,
    },
    scannerId: {
      type: String,
      default: "TERMINAL-01",
    },
    result: {
      type: String,
      enum: ["SUCCESS", "EXPIRED", "NOT_FOUND", "SUSPENDED", "REVOKED"],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const ScanLog: Model<IScanLog> =
  mongoose.models.ScanLog || mongoose.model<IScanLog>("ScanLog", ScanLogSchema);
