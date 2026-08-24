import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { z } from "zod";
import { authErrorResponse } from "@/modules/auth/infrastructure/http";
import { requireActiveRequestUser } from "@/modules/auth/infrastructure/active-request-user";
import { assertSameOrigin } from "@/modules/auth/infrastructure/request-security";
import { ReadingSettingsService } from "@/modules/settings/application/reading-settings-service";
import { MongoReadingSettingsRepository } from "@/modules/settings/infrastructure/reading-settings-repository";

const updateSchema = z.object({
  autoAdvance: z.boolean().optional(),
  boostMode: z.boolean().optional(),
  focusPresentation: z.enum(["orp", "vertical", "horizontal"]).optional(),
  fontFamily: z.enum(["serif", "sans", "mono"]).optional(),
  fontSize: z.enum(["small", "medium", "large", "extra-large"]).optional(),
  horizontalDirection: z.enum(["left-to-right", "right-to-left"]).optional(),
  wordsPerBlock: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  wpm: z.number().int().min(100).max(1000).optional(),
  verticalDirection: z.enum(["up", "down"]).optional(),
}).strict();

const service = () => new ReadingSettingsService(new MongoReadingSettingsRepository());

export async function GET(request: Request) {
  try {
    const user = await requireActiveRequestUser(request);
    return NextResponse.json({ settings: await service().get(user.id) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireActiveRequestUser(request);
    const input = updateSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return apiError(request, "INVALID_INPUT", "Check the reading settings." , 400 );
    }
    return NextResponse.json({ settings: await service().update(user.id, input.data) });
  } catch (error) {
    return authErrorResponse(error, request);
  }
}
