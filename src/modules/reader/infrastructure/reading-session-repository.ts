import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import type {
  ReadingSessionRepository,
  ReadingSessionView,
} from "../application/reading-session-service";
import { ReadingSessionModel, type ReadingSession } from "./reading-session.model";

function view(session: ReadingSession & { _id: Types.ObjectId }): ReadingSessionView {
  return {
    averageWpm: session.averageWpm,
    contentId: session.contentId.toString(),
    endedAt: session.endedAt?.toISOString(),
    id: session._id.toString(),
    mode: session.mode,
    startedAt: session.startedAt.toISOString(),
    wordsRead: session.wordsRead,
  };
}

export class MongoReadingSessionRepository implements ReadingSessionRepository {
  async create(input: { contentId: string; mode: "continuous" | "focus"; userId: string; now: Date }) {
    await connectToMongo();
    const session = await ReadingSessionModel.create({
      contentId: new Types.ObjectId(input.contentId),
      mode: input.mode,
      startedAt: input.now,
      userId: new Types.ObjectId(input.userId),
    });
    return view(session);
  }

  async finish(input: { id: string; userId: string; wordsRead: number; now: Date }) {
    if (!Types.ObjectId.isValid(input.id) || !Types.ObjectId.isValid(input.userId)) return null;
    await connectToMongo();
    const current = await ReadingSessionModel.findOne({
      _id: new Types.ObjectId(input.id),
      userId: new Types.ObjectId(input.userId),
    }).exec();
    if (!current) return null;
    if (current.endedAt) return view(current);
    const minutes = Math.max(1 / 60, (input.now.getTime() - current.startedAt.getTime()) / 60_000);
    current.endedAt = input.now;
    current.wordsRead = input.wordsRead;
    current.averageWpm = Math.min(5000, Math.round(input.wordsRead / minutes));
    await current.save();
    return view(current);
  }
}
