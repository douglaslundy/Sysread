import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { connectToMongo } from "../src/lib/db/mongodb";
import { ChapterModel } from "../src/modules/catalog/infrastructure/chapter.model";
import { ContentModel } from "../src/modules/catalog/infrastructure/content.model";
import {
  SUMMARY_PROVENANCE,
  summaryCatalog,
} from "../src/modules/catalog/seed/summaries";

function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function hash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function seedSummary(entry: (typeof summaryCatalog)[number]) {
  const content = await ContentModel.findOneAndUpdate(
    { kind: "summary", "sourceMetadata.seedKey": entry.slug },
    {
      $set: {
        author: entry.author,
        category: entry.category,
        cleanupLevel: "standard",
        coverUrl: `/covers/summaries/${entry.slug}.png`,
        kind: "summary",
        ownerId: null,
        processingStatus: "ready",
        publishedAt: new Date(entry.publishedAt),
        schemaVersion: 1,
        sourceMetadata: {
          provenance: SUMMARY_PROVENANCE,
          seedKey: entry.slug,
          sourceRights: "public_domain",
          summaryRights: "original_readcoach",
        },
        sourceType: "readcoach_summary",
        title: entry.title,
        visibility: "public",
      },
    },
    { new: true, setDefaultsOnInsert: true, upsert: true },
  ).exec();

  for (const [order, chapter] of entry.chapters.entries()) {
    await ChapterModel.updateOne(
      { contentId: content._id, order },
      {
        $set: {
          normalizedTextHash: hash(chapter.text),
          originalText: chapter.text,
          schemaVersion: 1,
          simplifiedVariants: [],
          title: chapter.title,
          wordCount: countWords(chapter.text),
        },
      },
      { upsert: true },
    ).exec();
  }

  await ChapterModel.deleteMany({
    contentId: content._id,
    order: { $gte: entry.chapters.length },
  }).exec();

  return entry.slug;
}

async function main() {
  await connectToMongo();
  const seeded: string[] = [];

  for (const entry of summaryCatalog) seeded.push(await seedSummary(entry));

  process.stdout.write(`Seed concluido: ${seeded.join(", ")}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `Falha no seed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
