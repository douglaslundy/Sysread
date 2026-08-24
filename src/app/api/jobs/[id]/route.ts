import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { MongoJobRepository } from "@/modules/jobs/infrastructure/job-repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireActiveRequestUser(request);
    const { id } = await context.params;
    const job = await new MongoJobRepository().findOwned(id, user.id);
    if (!job) {
      return apiError(request, "JOB_NOT_FOUND", "Job not found." , 404 );
    }
    return NextResponse.json({ job });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}