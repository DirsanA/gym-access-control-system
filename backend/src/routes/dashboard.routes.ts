import { Router } from "express";
import { env } from "../config/env";
import { authenticateAdmin } from "../middleware/authenticate";
import { CheckInModel } from "../models/check-in.model";
import { MemberModel } from "../models/member.model";
import { membershipStatus } from "../services/membership.service";
import { dateKey, todayInTimeZone } from "../utils/date";

const router = Router();
router.use(authenticateAdmin);

router.get("/", async (_request, response, next) => {
  try {
    const members = await MemberModel.find().sort({ createdAt: -1 }).limit(5_000).exec();
    const today = todayInTimeZone(env.gymTimeZone);
    const activeMembers = members.filter((member) => membershipStatus(member, env.gymTimeZone) === "ACTIVE");
    const expiringSoon = activeMembers.filter((member) => {
      const days = (Date.parse(dateKey(member.membershipEndDate)) - Date.parse(today)) / 86_400_000;
      return days >= 0 && days <= 7;
    });
    const startOfToday = new Date(`${today}T00:00:00.000Z`);
    const todayCheckIns = await CheckInModel.countDocuments({ result: "SUCCESS", scannedAt: { $gte: startOfToday } }).exec();
    const recent = await CheckInModel.find().sort({ scannedAt: -1 }).limit(12).populate("member", "fullName membershipPlan").exec();

    response.json({
      success: true,
      statistics: { totalMembers: members.length, activeMembers: activeMembers.length, expiredMembers: members.length - activeMembers.length, todayCheckIns },
      expiringSoon: expiringSoon.slice(0, 8).map((member) => ({ memberId: member.memberId, fullName: member.fullName, membershipEndDate: dateKey(member.membershipEndDate) })),
      recentCheckIns: recent.map((item) => {
        const member = item.member as unknown as { fullName?: string; membershipPlan?: string } | null;
        return { id: item._id.toString(), memberId: item.memberId, fullName: member?.fullName ?? "Unknown member", membershipPlan: member?.membershipPlan ?? "—", scannedAt: item.scannedAt.toISOString(), result: item.result };
      }),
    });
  } catch (error) { next(error); }
});

export { router as dashboardRouter };
