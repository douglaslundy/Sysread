import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      user: user
        ? {
            email: user.emailNormalized,
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : null,
    });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
