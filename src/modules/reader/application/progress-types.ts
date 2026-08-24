import type { TextVariant } from "./types";

export interface ReadingCheckpoint {
  chapterId: string;
  completed: boolean;
  contentId: string;
  paragraphAnchor?: string;
  percent: number;
  revision: number;
  textVariant: TextVariant;
  textVersionHash: string;
  updatedAt: string;
  wordIndex: number;
}

export interface SaveCheckpointInput {
  chapterId: string;
  completed: boolean;
  contentId: string;
  paragraphAnchor?: string;
  percent: number;
  revision: number;
  textVariant: TextVariant;
  textVersionHash: string;
  userId: string;
  wordIndex: number;
}

export interface ProgressRepository {
  find(contentId: string, userId: string): Promise<ReadingCheckpoint | null>;
  save(input: SaveCheckpointInput): Promise<ReadingCheckpoint | "PROGRESS_CONFLICT">;
}
