# Elite Fitness Club — Full-Stack Gym Management & Turnstile System

Elite Fitness is an athletic club management system built with Next.js, TypeScript, MongoDB, Brevo SMTP email verification, and Chapa Ethiopian Birr (ETB) payments.

## Architecture & Features

1. **Authentication & Email OTP Verification**:
   - Customer registration with validation for unique usernames and normalized email addresses.
   - Cryptographically random 6-digit OTP delivery via Brevo (Sendinblue) SMTP (`smtp-relay.brevo.com:587`).
   - Secure SHA-256 hashed OTP verification with auto-expiry (TTL) and rate-limiting.
   - HTTP-only, secure JWT cookie-based session management.

2. **Customer Portal & Dashboard (`/profile`)**:
   - Live membership status, validity dates, and account verification badge.
   - Dynamic plan catalog in Ethiopian Birr (ETB) with features breakdown.
   - Digital membership pass presentation with real-time QR code generation.
   - Chapa payment gateway checkout & payment history.

3. **Payments & Checkout**:
   - **Online via Chapa**: Server-side checkout initialization (`/api/payments/chapa/initialize`) and verification (`/api/payments/chapa/verify`).
   - **Cash Payments**: Front desk cash collection recorded by authorized admins (`/api/admin/payments/cash`) with full audit history.
   - Idempotent membership activation with expiration extensions for consecutive renewals.

4. **Digital Pass & Entrance QR Scanner (`/scanner`)**:
   - Opaque, unpredictable ticket tokens (`TKT-...`) stored securely in MongoDB.
   - High-contrast downloadable printable cards with canvas rendering.
   - Real turnstile camera scanner (`jsQR`) with instant visual and audio pass validation, failing closed on expired, revoked, or unpaid memberships.
   - Automatic entrance scan logging in `ScanLog` collection.

5. **Role-Protected Admin Console (`/admin`)**:
   - Real-time revenue metrics (Total ETB, Cash ETB, Online Chapa ETB).
   - Member directory with instant search, filtering, and manual enrollment.
   - 1-Click cash payment recording and membership activation modal.
   - Real-time gate scan attendance audit logs.
   - Membership expiry tracking (&le; 7 days).

---

## Local Development Setup

### 1. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your variables in `.env`:

```env
# MongoDB Database
MONGODB_URI=mongodb://127.0.0.1:27017/elite_fitness

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_elite_fitness_at_least_32_chars

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Brevo (Sendinblue) SMTP
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_smtp_user
BREVO_SMTP_PASS=your_brevo_smtp_password
BREVO_FROM_EMAIL=no-reply@elitefitness.et
BREVO_FROM_NAME="Elite Fitness Club"

# Chapa Payment Gateway
CHAPA_SECRET_KEY=CHASECK_TEST-xxxx
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxx
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret

# Initial Admin Account (Seeded on first run)
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_EMAIL=admin@elitefitness.et
INITIAL_ADMIN_PASSWORD=AdminElite2026!
INITIAL_ADMIN_PHONE=+251911223344
```

### 2. Database Seeding

Run the seed script to initialize default ETB membership plans and the first administrator:

```bash
npx tsx scripts/seed.ts
```

### 3. Run Development Server

```bash
npm run dev
```

Visit:
- `http://localhost:3000` — Landing page
- `http://localhost:3000/register` — Customer sign up & OTP verification
- `http://localhost:3000/login` — Sign in
- `http://localhost:3000/profile` — Customer portal & active digital pass
- `http://localhost:3000/scanner` — Turnstile entrance QR scanner
- `http://localhost:3000/admin` — Operations console & cash recording
