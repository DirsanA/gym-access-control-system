import mongoose from "mongoose";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error(
        "[MONGODB CONFIG ERROR] MONGODB_URI environment variable is missing! In Vercel, go to Project Settings -> Environment Variables, ensure MONGODB_URI is added for Production & Preview, and trigger a REDEPLOY."
      );
    }
    return "mongodb://127.0.0.1:27017/elite_fitness";
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let eventListenersAttached = false;

function attachListeners() {
  if (eventListenersAttached) return;
  eventListenersAttached = true;

  mongoose.connection.on("disconnected", () => {
    console.warn("[MONGODB] Connection dropped/disconnected. Resetting connection pool.");
    cached.conn = null;
    cached.promise = null;
  });

  mongoose.connection.on("error", (err) => {
    console.error("[MONGODB] Connection error event:", err?.message || err);
    cached.conn = null;
    cached.promise = null;
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MONGODB] Reconnected successfully to Atlas cluster.");
  });
}

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected and readyState is 1 (connected), reuse active connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection is disconnected (0) or disconnecting (3), purge stale promise
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.conn = null;
    cached.promise = null;
  }

  attachListeners();

  if (!cached.promise) {
    const uri = getMongoUri();
    const isAtlas = uri.startsWith("mongodb+srv://") || uri.includes(".mongodb.net");

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    };

    console.log(`[MONGODB] Establishing fresh connection to ${isAtlas ? "MongoDB Atlas" : "local MongoDB"}...`);
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[MONGODB] Connected successfully to ${isAtlas ? "MongoDB Atlas cluster" : "local database"}.`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    cached.conn = null;
    console.error("[MONGODB ERROR] Connection failed:", e?.message || e);
    throw e;
  }

  return cached.conn;
}
