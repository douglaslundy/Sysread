import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireAdminRequestUser } from "@/modules/auth/infrastructure/admin-request-user";
import { listAdminPublicationRequests } from "@/modules/publication/application/publication-service";

export async function GET(request: Request) {
  try {
    await requireAdminRequestUser(request);
    return NextResponse.json({ requests: await listAdminPublicationRequests() });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
