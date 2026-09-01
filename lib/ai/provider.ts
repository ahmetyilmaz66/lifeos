import type { DocumentAnalysisProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";

class UnconfiguredProvider implements DocumentAnalysisProvider {
  async analyze(): Promise<never> {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  }
}

export function getDocumentAnalysisProvider(): DocumentAnalysisProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider(apiKey);
  return new UnconfiguredProvider();
}