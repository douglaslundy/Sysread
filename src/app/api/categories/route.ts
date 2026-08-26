import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { listCategories } from "@/modules/categories/application/category-service";

export async function GET(request: Request) {
  try {
    await requireActiveRequestUser(request);
    return NextResponse.json({ categories: await listCategories({ activeOnly: true }) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
