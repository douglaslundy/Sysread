import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { exportUserData } from "@/modules/privacy/application/privacy-service";

export async function GET(request: Request) {
  try {
    const user = await requireActiveRequestUser(request);
    const data = await exportUserData(user.id);
    if (!data) return new Response(null, { status: 404 });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "cache-control": "no-store",
        "content-disposition": 'attachment; filename="readcoach-export.json"',
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
