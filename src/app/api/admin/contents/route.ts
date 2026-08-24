import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { createAdminContent, listAdminContents } from "@/modules/admin/application/admin-service";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";

const schema = z.object({ author: z.string().trim().max(240).optional(), assignedUserId: z.string().optional(), category: z.string().trim().max(80).optional(), text: z.string().trim().min(20).max(2_000_000), title: z.string().trim().min(2).max(500), visibility: z.enum(["private", "public"]) }).strict();

export async function GET(request: Request) {
  try { await requireAdminRequestUser(request); return NextResponse.json({ contents: await listAdminContents() }); }
  catch (error) { return authErrorResponse(error, request); }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); await requireAdminRequestUser(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return apiError(request, "INVALID_INPUT", "Verifique os dados do conteúdo.", 400);
    return NextResponse.json({ id: await createAdminContent(input.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ASSIGNEE_REQUIRED") return apiError(request, "ASSIGNEE_REQUIRED", "Selecione o usuário do conteúdo privado.", 400);
    return authErrorResponse(error, request);
  }
}
