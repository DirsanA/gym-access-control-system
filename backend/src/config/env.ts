import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  gymTimeZone: process.env.GYM_TIME_ZONE ?? "Africa/Nairobi",
  jwtSecret: required("JWT_SECRET"),
};
