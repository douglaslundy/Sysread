import type { ServerEnv } from "@/lib/env";
import { createEpubImportHandler } from "@/modules/imports/infrastructure/epub-import-handler";
import { createMobiImportHandler } from "@/modules/imports/infrastructure/mobi-import-handler";
import { createPdfImportHandler } from "@/modules/imports/infrastructure/pdf-import-handler";
import { createPrivateObjectStorage } from "@/modules/imports/infrastructure/private-storage-factory";
import { createUrlImportHandler } from "@/modules/imports/infrastructure/url-import-handler";
import { createSimplificationHandler } from "@/modules/magic/infrastructure/simplification-handler";
import { JobRunner } from "../application/job-runner";
import { JsonJobEventSink } from "./json-job-events";
import { MongoJobRepository } from "./job-repository";

export function createRuntimeJobRunner(env: ServerEnv) {
  const storage = createPrivateObjectStorage(env);
  return new JobRunner(
    new MongoJobRepository(),
    {
      import_epub: createEpubImportHandler(storage),
      import_mobi: createMobiImportHandler(storage),
      import_pdf: createPdfImportHandler(storage),
      import_url: createUrlImportHandler({
        maxBytes: env.MAX_URL_IMPORT_BYTES,
        timeoutMs: env.URL_FETCH_TIMEOUT_MS,
      }),
      simplify: createSimplificationHandler(),
    },
    { events: new JsonJobEventSink() },
  );
}
