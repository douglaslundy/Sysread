import { Types } from "mongoose";
import { connectToMongo } from "../../../lib/db/mongodb";
import { ReadingProgressModel } from "../../reader/infrastructure/reading-progress.model";
import {
  ContentModel,
  type Content,
} from "./content.model";
import {
  decodeCatalogCursor,
  encodeCatalogCursor,
} from "../application/cursor";
import type {
  CatalogItem,
  CatalogRepository,
  ListPersonalInput,
  ListSummariesInput,
  Page,
} from "../application/types";

function mapContent(
  content: Content & { _id: Types.ObjectId },
  progressPercent?: number,
): CatalogItem {
  return {
    author: content.author,
    category: content.category,
    coverUrl: content.coverUrl,
    id: content._id.toString(),
    kind: content.kind,
    progressPercent,
    publishedAt: content.publishedAt?.toISOString(),
    title: content.title,
    updatedAt: content.updatedAt.toISOString(),
  };
}

export class MongoCatalogRepository implements CatalogRepository {
  async listPersonal(
    input: ListPersonalInput,
  ): Promise<Page<CatalogItem>> {
    await connectToMongo();
    const query: Record<string, unknown> = {
      kind: "personal",
      ownerId: new Types.ObjectId(input.ownerId),
      visibility: "private",
    };
    const cursor = input.cursor
      ? decodeCatalogCursor(input.cursor)
      : null;

    if (input.cursor && !cursor) throw new Error("INVALID_CURSOR");
    if (cursor) {
      const timestamp = new Date(cursor.timestamp);
      query.$or = [
        { updatedAt: { $lt: timestamp } },
        {
          _id: { $lt: new Types.ObjectId(cursor.id) },
          updatedAt: timestamp,
        },
      ];
    }

    const contents = await ContentModel.find(query)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(input.limit + 1)
      .exec();
    const hasMore = contents.length > input.limit;
    const pageContents = contents.slice(0, input.limit);
    const progress = await ReadingProgressModel.find({
      contentId: { $in: pageContents.map((content) => content._id) },
      userId: new Types.ObjectId(input.ownerId),
    }).exec();
    const progressByContent = new Map(
      progress.map((item) => [item.contentId.toString(), item.percent]),
    );
    const last = pageContents.at(-1);

    return {
      items: pageContents.map((content) =>
        mapContent(content, progressByContent.get(content._id.toString())),
      ),
      nextCursor:
        hasMore && last
          ? encodeCatalogCursor({
              id: last._id.toString(),
              timestamp: last.updatedAt.toISOString(),
            })
          : null,
    };
  }

  async listSummaries(
    input: ListSummariesInput,
  ): Promise<Page<CatalogItem>> {
    await connectToMongo();
    const query: Record<string, unknown> = {
      kind: "summary",
      processingStatus: "ready",
      publishedAt: { $ne: null },
      visibility: "public",
    };
    if (input.category) query.category = input.category;

    const cursor = input.cursor
      ? decodeCatalogCursor(input.cursor)
      : null;
    if (input.cursor && !cursor) throw new Error("INVALID_CURSOR");
    if (cursor) {
      const timestamp = new Date(cursor.timestamp);
      query.$or = [
        { publishedAt: { $lt: timestamp } },
        {
          _id: { $lt: new Types.ObjectId(cursor.id) },
          publishedAt: timestamp,
        },
      ];
    }

    const contents = await ContentModel.find(query)
      .sort({ publishedAt: -1, _id: -1 })
      .limit(input.limit + 1)
      .exec();
    const hasMore = contents.length > input.limit;
    const pageContents = contents.slice(0, input.limit);
    const last = pageContents.at(-1);

    return {
      items: pageContents.map((content) => mapContent(content)),
      nextCursor:
        hasMore && last?.publishedAt
          ? encodeCatalogCursor({
              id: last._id.toString(),
              timestamp: last.publishedAt.toISOString(),
            })
          : null,
    };
  }
}
