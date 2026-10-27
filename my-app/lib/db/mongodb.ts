import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/elite_fitness";

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
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      family: 4, // Force IPv4 to prevent IPv6 routing delays
      retryWrites: true,
      retryReads: true,
    };

    console.log("[MONGODB] Establishing fresh connection to MongoDB Atlas...");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log("[MONGODB] Connected to MongoDB Atlas cluster successfully.");
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
