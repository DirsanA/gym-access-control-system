import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function start(): Promise<void> {
  await connectDatabase(env.mongoUri);
  app.listen(env.port, () => {
    console.log(`Gym access API listening on port ${env.port}`);
  });
}

start().catch((error: unknown) => {
  console.error("Unable to start the gym access API", error);
  process.exit(1);
});
