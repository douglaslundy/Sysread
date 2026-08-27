import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { deleteOwnNote, NoteError } from "@/modules/notes/application/note-service";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const { id } = await context.params;
    await deleteOwnNote({ noteId: id, userId: user.id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof NoteError) return apiError(request, error.code, error.message, error.status);
    return authErrorResponse(error, request);
  }
}
