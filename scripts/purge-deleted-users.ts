import mongoose from "mongoose";
import { getServerEnv } from "../src/lib/env";
import { logEvent } from "../src/lib/observability";
import { purgeDeletedUsers } from "../src/modules/privacy/application/purge-deleted-users";

purgeDeletedUsers(getServerEnv())
  .catch((error: unknown) => {
    logEvent({
      event: "privacy_purge_failed",
      fields: {
        errorType: error instanceof Error ? error.name : "unknown",
      },
      level: "error",
    });
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());