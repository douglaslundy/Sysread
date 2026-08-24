export type FocusAdvance =
  | { type: "stop" }
  | { paragraphIndex: number; type: "paragraph" }
  | { chapterIndex: number; type: "chapter" }
  | { type: "complete" };

export function nextFocusAdvance(input: { chapterCount: number; chapterIndex: number; continuous: boolean; paragraphCount: number; paragraphIndex: number }): FocusAdvance {
  if (!input.continuous) return { type: "stop" };
  if (input.paragraphIndex + 1 < input.paragraphCount) return { paragraphIndex: input.paragraphIndex + 1, type: "paragraph" };
  if (input.chapterIndex + 1 < input.chapterCount) return { chapterIndex: input.chapterIndex + 1, type: "chapter" };
  return { type: "complete" };
}
