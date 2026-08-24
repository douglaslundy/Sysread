import { apiError } from "@/lib/api-response";
import { ReaderError } from "../application/reader-service";

export function readerErrorResponse(error: ReaderError, request?: Request) {
  return apiError(request, error.code, error.message, error.code === "VARIANT_NOT_READY" ? 409 : 404);
}