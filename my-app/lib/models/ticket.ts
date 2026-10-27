import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITicket extends Document {
  ticketToken: string; // Cryptographically random opaque token
  memberId: string; // GYM-000123
  userId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  qrPayload: string;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    ticketToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    memberId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    qrPayload: {
      type: String,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance ticket validation and checkpoint checks
TicketSchema.index({ memberId: 1, isRevoked: 1 });
TicketSchema.index({ userId: 1, isRevoked: 1 });
TicketSchema.index({ ticketToken: 1, isRevoked: 1 });

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);
