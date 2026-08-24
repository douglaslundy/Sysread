import { z } from "zod";
import {
  SIMPLIFICATION_INSTRUCTIONS,
  SIMPLIFICATION_MODEL,
  SimplificationError,
  simplificationJsonSchema,
  simplificationOutputSchema,
} from "../application/simplification-service";
import type { SimplificationPort } from "../application/types";

const responseSchema = z.object({
  model: z.string(),
  output: z.array(z.object({
    content: z.array(z.object({
      text: z.string().optional(),
      type: z.string(),
    }).passthrough()).optional(),
    type: z.string(),
  }).passthrough()),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
  }),
}).passthrough();

export class OpenAiSimplificationProvider implements SimplificationPort {
  constructor(
    private readonly apiKey: string,
    private readonly model = SIMPLIFICATION_MODEL,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async simplify(input: { maxOutputTokens: number; sourceText: string }) {
    let response: Response;
    try {
      response = await this.fetcher("https://api.openai.com/v1/responses", {
        body: JSON.stringify({
          input: [{
            content: [{
              text: "<SOURCE_TEXT>\n" + input.sourceText + "\n</SOURCE_TEXT>",
              type: "input_text",
            }],
            role: "user",
          }],
          instructions: SIMPLIFICATION_INSTRUCTIONS,
          max_output_tokens: input.maxOutputTokens,
          model: this.model,
          reasoning: { effort: "low" },
          store: false,
          text: {
            format: {
              name: "chapter_simplification",
              schema: simplificationJsonSchema,
              strict: true,
              type: "json_schema",
            },
          },
        }),
        headers: {
          Authorization: "Bearer " + this.apiKey,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      throw new SimplificationError("AI_PROVIDER_ERROR", true, "AI provider is temporarily unavailable.");
    }

    if (!response.ok) {
      throw new SimplificationError(
        response.status === 429 ? "AI_LIMIT" : "AI_PROVIDER_ERROR",
        response.status === 408 || response.status === 429 || response.status >= 500,
        "AI provider rejected the request.",
      );
    }

    const envelope = responseSchema.safeParse(await response.json());
    if (!envelope.success) {
      throw new SimplificationError("AI_INVALID_OUTPUT", true, "AI response envelope was invalid.");
    }
    const outputText = envelope.data.output
      .flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text;
    if (!outputText) {
      throw new SimplificationError("AI_INVALID_OUTPUT", true, "AI response did not contain output text.");
    }
    let decoded: unknown;
    try {
      decoded = JSON.parse(outputText);
    } catch {
      throw new SimplificationError("AI_INVALID_OUTPUT", true, "AI output was not valid JSON.");
    }
    const parsed = simplificationOutputSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new SimplificationError("AI_INVALID_OUTPUT", true, "AI output did not match the schema.");
    }
    return {
      model: envelope.data.model,
      simplifiedText: parsed.data.simplifiedText,
      usage: {
        inputTokens: envelope.data.usage.input_tokens,
        outputTokens: envelope.data.usage.output_tokens,
        totalTokens: envelope.data.usage.total_tokens,
      },
    };
  }
}
