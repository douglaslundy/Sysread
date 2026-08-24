import mongoose from "mongoose";
import { connectToMongo } from "../src/lib/db/mongodb";
import { normalizeEmail } from "../src/modules/auth/application/auth-service";
import { UserModel } from "../src/modules/users/infrastructure/user.model";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run admin:promote -- user@example.com");
  await connectToMongo();
  const user = await UserModel.findOneAndUpdate(
    { emailNormalized: normalizeEmail(email), lifecycleStatus: "active" },
    {
      $inc: { authVersion: 1 },
      $set: { role: "admin", schemaVersion: 2 },
    },
    { returnDocument: "after", runValidators: true },
  ).exec();
  if (!user) throw new Error("Active user not found.");
  process.stdout.write(`administrator promoted: ${user.emailNormalized}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : "Promotion failed.") + "\n");
  process.exitCode = 1;
}).finally(async () => mongoose.disconnect());
