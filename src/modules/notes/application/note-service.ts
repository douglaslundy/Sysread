import { Types } from "mongoose";
import { connectToMongo } from "@/lib/db/mongodb";
import { ContentModel } from "@/modules/catalog/infrastructure/content.model";
import { ReaderError, ReaderService } from "@/modules/reader/application/reader-service";
import { MongoReaderRepository } from "@/modules/reader/infrastructure/reader-repository";
import { NoteModel } from "../infrastructure/note.model";

export type NoteRow = {
  chapterId: string;
  contentAuthor?: string;
  contentId: string;
  contentTitle: string;
  createdAt: string;
  excerpt: string;
  id: string;
  paragraphAnchor?: string;
  title: string;
};

export class NoteError extends Error {
  constructor(readonly code: "INVALID_NOTE" | "NOTE_NOT_FOUND", readonly status: number) {
    super(code);
  }
}

export async function createNote(input: {
  chapterId: string;
  contentId: string;
  excerpt: string;
  paragraphAnchor?: string;
  title: string;
  userId: string;
}): Promise<NoteRow> {
  try {
    await new ReaderService(new MongoReaderRepository()).getChapter({
      actorUserId: input.userId,
      chapterId: input.chapterId,
      contentId: input.contentId,
      variant: "original",
    });
  } catch (error) {
    if (error instanceof ReaderError) throw new NoteError("INVALID_NOTE", 400);
    throw error;
  }
  await connectToMongo();
  const content = await ContentModel.findById(input.contentId).select("author title").lean().exec();
  if (!content) throw new NoteError("INVALID_NOTE", 400);
  const note = await NoteModel.create({
    chapterId: new Types.ObjectId(input.chapterId),
    contentId: new Types.ObjectId(input.contentId),
    excerpt: input.excerpt,
    paragraphAnchor: input.paragraphAnchor,
    title: input.title,
    userId: new Types.ObjectId(input.userId),
  });
  return {
    chapterId: note.chapterId.toString(),
    contentAuthor: content.author,
    contentId: note.contentId.toString(),
    contentTitle: content.title,
    createdAt: note.createdAt.toISOString(),
    excerpt: note.excerpt,
    id: note._id.toString(),
    paragraphAnchor: note.paragraphAnchor,
    title: note.title,
  };
}

export async function listOwnNotes(userId: string, contentId?: string): Promise<NoteRow[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  if (contentId !== undefined && !Types.ObjectId.isValid(contentId)) return [];
  await connectToMongo();
  const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (contentId) query.contentId = new Types.ObjectId(contentId);
  const notes = await NoteModel.find(query)
    .sort({ createdAt: -1 })
    .limit(1_000)
    .lean()
    .exec();
  const contentIds = notes.map((note) => note.contentId);
  const contents = await ContentModel.find({ _id: { $in: contentIds } }).select("author title").lean().exec();
  const contentById = new Map(contents.map((item) => [item._id.toString(), item]));
  return notes.flatMap((note) => {
    const content = contentById.get(note.contentId.toString());
    if (!content) return [];
    return [{
      chapterId: note.chapterId.toString(),
      contentAuthor: content.author,
      contentId: note.contentId.toString(),
      contentTitle: content.title,
      createdAt: note.createdAt.toISOString(),
      excerpt: note.excerpt,
      id: note._id.toString(),
      paragraphAnchor: note.paragraphAnchor,
      title: note.title,
    }];
  });
}

export async function deleteOwnNote(input: { noteId: string; userId: string }): Promise<void> {
  if (!Types.ObjectId.isValid(input.noteId) || !Types.ObjectId.isValid(input.userId)) {
    throw new NoteError("NOTE_NOT_FOUND", 404);
  }
  await connectToMongo();
  const result = await NoteModel.deleteOne({
    _id: new Types.ObjectId(input.noteId),
    userId: new Types.ObjectId(input.userId),
  }).exec();
  if (result.deletedCount === 0) throw new NoteError("NOTE_NOT_FOUND", 404);
}
