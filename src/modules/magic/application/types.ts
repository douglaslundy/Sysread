export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface SimplificationResult {
  model: string;
  simplifiedText: string;
  usage: AiUsage;
}

export interface SimplificationPort {
  simplify(input: {
    maxOutputTokens: number;
    sourceText: string;
  }): Promise<SimplificationResult>;
}

export interface SimplificationRequestResult {
  jobId?: string;
  state: "queued" | "processing" | "ready";
}
