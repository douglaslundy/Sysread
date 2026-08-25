import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { listOwnPublicationRequests } from "@/modules/publication/application/publication-service";

export async function GET(request: Request) {
  try {
    const user = await requireActiveRequestUser(request);
    return NextResponse.json({ requests: await listOwnPublicationRequests(user.id) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
