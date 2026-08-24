import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/modules/admin/application/admin-service";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";

export async function GET(request: Request) {
  try {
    await requireAdminRequestUser(request);
    return NextResponse.json(await getAdminDashboard());
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
