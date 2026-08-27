import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { createNote, listOwnNotes, NoteError } from "@/modules/notes/application/note-service";

const createSchema = z.object({
  chapterId: z.string().min(1),
  contentId: z.string().min(1),
  excerpt: z.string().trim().min(1).max(8_000),
  paragraphAnchor: z.string().max(200).optional(),
  title: z.string().trim().min(1).max(200),
});

function noteErrorResponse(request: Request, error: NoteError) {
  return apiError(request, error.code, error.message, error.status);
}

export async function GET(request: Request) {
  try {
    const user = await requireActiveRequestUser(request);
    return NextResponse.json({ notes: await listOwnNotes(user.id) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const input = createSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return apiError(request, "INVALID_NOTE", "Provide a title and the selected excerpt.", 400);
    }
    const note = await createNote({ ...input.data, userId: user.id });
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof NoteError) return noteErrorResponse(request, error);
    return authErrorResponse(error, request);
  }
}
