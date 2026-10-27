import { connectDB } from "@/lib/db/mongodb";
import { Plan, User } from "@/lib/models";
import bcrypt from "bcryptjs";


async function seed() {
  console.log("🌱 Starting Elite Fitness database initialization & seeding...");
  await connectDB();

  // 1. Seed or update Plans
  const defaultPlans = [
    {
      name: "1 Month Standard Membership",
      slug: "1-month-standard",
      description: "Full access to training facility, locker rooms, free weights, and turnstile access.",
      priceETB: 2500,
      durationMonths: 1,
      durationDays: 30,
      isActive: true,
      features: [
        "Unrestricted gym floor access",
        "Digital encrypted QR entry card",
        "Free fitness assessment",
        "Locker & shower facilities",
      ],
    },
    {
      name: "3 Month Accelerated Membership",
      slug: "3-month-accelerated",
      description: "Best for committed lifters. Includes conditioning floor, hypertrophy zone, and discounts.",
      priceETB: 6500,
      durationMonths: 3,
      durationDays: 90,
      isActive: true,
      features: [
        "All 1-Month privileges included",
        "1 Free personal coaching session",
        "Free guest weekend pass",
        "Telegram & WhatsApp pass sharing",
      ],
    },
    {
      name: "Annual Elite Championship Pass",
      slug: "annual-elite-pass",
      description: "Full year VIP membership with dedicated locker, recovery lounge, and priority entry.",
      priceETB: 22000,
      durationMonths: 12,
      durationDays: 365,
      isActive: true,
      features: [
        "365 Days 24/7 Priority Entrance Access",
        "VIP recovery lounge & sauna",
        "Unlimited guest passes",
        "Complimentary Elite Fitness gym apparel",
      ],
    },
  ];

  for (const p of defaultPlans) {
    const existing = await Plan.findOne({ slug: p.slug });
    if (!existing) {
      await Plan.create(p);
      console.log(`✅ Created plan: ${p.name} (${p.priceETB} ETB)`);
    } else {
      console.log(`ℹ️ Plan already exists: ${p.name}`);
    }
  }

  // 2. Seed initial Administrator
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "admin";
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "admin@elitefitness.et").toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "AdminElite2026!";
  const adminPhone = process.env.INITIAL_ADMIN_PHONE || "+251911223344";

  const existingAdmin = await User.findOne({
    $or: [{ email: adminEmail }, { username: adminUsername }],
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await User.create({
      username: adminUsername,
      email: adminEmail,
      phone: adminPhone,
      fullName: "Elite Fitness Administrator",
      passwordHash,
      role: "admin",
      isVerified: true,
      isSuspended: false,
    });
    console.log(`👑 Created initial Admin account: ${adminUsername} (${adminEmail})`);
  } else {
    // Ensure role is admin
    if (existingAdmin.role !== "admin" || !existingAdmin.isVerified) {
      existingAdmin.role = "admin";
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      console.log(`👑 Updated existing account to verified Admin: ${existingAdmin.email}`);
    } else {
      console.log(`ℹ️ Admin account already exists: ${existingAdmin.email}`);
    }
  }

  console.log("🚀 Database initialization complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
