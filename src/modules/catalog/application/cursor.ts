import { z } from "zod";

const cursorSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  timestamp: z.string().datetime(),
});

export type CatalogCursor = z.infer<typeof cursorSchema>;

export function encodeCatalogCursor(cursor: CatalogCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCatalogCursor(value: string): CatalogCursor | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    const result = cursorSchema.safeParse(decoded);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}