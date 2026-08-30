import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { UserModel } from "../models/user.model";
import { createAdminToken } from "../services/auth.service";

const router = Router();
const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(200) });

router.post("/login", async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: "Enter a valid email and password." });
      return;
    }

    const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash").exec();
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      response.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    response.json({
      success: true,
      token: createAdminToken({ sub: user._id.toString(), email: user.email, role: "ADMIN" }),
      admin: { id: user._id.toString(), fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
