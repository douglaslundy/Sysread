import { NextResponse } from "next/server";
import { listAdminUsers } from "@/modules/admin/application/admin-service";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";

export async function GET(request: Request) {
  try {
    await requireAdminRequestUser(request);
    const url = new URL(request.url);
    return NextResponse.json({ users: await listAdminUsers({ search: url.searchParams.get("search") ?? undefined, status: url.searchParams.get("status") ?? undefined }) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
