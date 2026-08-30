import { CounterModel } from "../models/counter.model";

const MEMBER_COUNTER_KEY = "member-id";

export async function nextMemberId(): Promise<string> {
  const counter = await CounterModel.findByIdAndUpdate(
    MEMBER_COUNTER_KEY,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  return `GYM-${String(counter.sequence).padStart(6, "0")}`;
}
