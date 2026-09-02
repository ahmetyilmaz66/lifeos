import { GoogleGenAI } from "@google/genai";

import { documentAnalysisInstructions, documentCategories, type DocumentAnalysisInput, type DocumentAnalysisProvider } from "../types";

const supportedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);
const model = "gemini-3.6-flash";

const responseJsonSchema = {
  type: "object",
  properties: {
    documentType: { type: ["string", "null"] },
    category: { type: "string", enum: [...documentCategories] },
    title: { type: ["string", "null"] },
    provider: { type: ["string", "null"] },
    amount: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    startDate: { type: ["string", "null"], format: "date" },
    endDate: { type: ["string", "null"], format: "date" },
    nextDueDate: { type: ["string", "null"], format: "date" },
    recurrence: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    extractedFields: { type: "object", additionalProperties: true },
    warnings: { type: "array", items: { type: "string" }, maxItems: 30 },
  },
  required: ["documentType", "category", "title", "provider", "amount", "currency", "startDate", "endDate", "nextDueDate", "recurrence", "description", "confidence", "extractedFields", "warnings"],
  additionalProperties: false,
};

export class GeminiProvider implements DocumentAnalysisProvider {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async analyze(input: DocumentAnalysisInput): Promise<unknown> {
    if (!supportedMimeTypes.has(input.fileType)) throw new Error("UNSUPPORTED_DOCUMENT_TYPE");

    const isText = input.fileType === "text/plain";
    const media = isText
      ? null
      : input.fileType === "application/pdf"
        ? { type: "document" as const, mime_type: input.fileType, data: input.content.toString("base64") }
        : { type: "image" as const, mime_type: input.fileType, data: input.content.toString("base64") };
    const knownProvidersLine = input.knownProviders?.length
      ? ` Known providers and their LifeOS category (use these exact category values when the document's provider matches one, even loosely — e.g. by brand name or common alias): ${input.knownProviders.map((p) => `${p.name}=${p.category}`).join(", ")}. If the provider is not in this list, classify it as best you can from context — a new, unrecognized provider is expected and fine.`
      : "";
    const instructionText = isText
      ? `${documentAnalysisInstructions} The user typed or pasted the following free-form Turkish text describing a subscription, bill, warranty, or similar for LifeOS. Extract the same structured fields from it. Preserve currency when clearly stated. Do not retain unnecessary personal identifiers.${knownProvidersLine}\n\nMETİN:\n${input.content.toString("utf-8").slice(0, 4000)}`
      : `${documentAnalysisInstructions} Analyze this Turkish document for LifeOS reminders and organization. Preserve currency when clearly visible. Do not retain unnecessary personal identifiers.${knownProvidersLine}`;
    const response = await this.client.interactions.create({
      model,
      input: isText
        ? [{ type: "text", text: instructionText }]
        : [{ type: "text", text: instructionText }, media!],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseJsonSchema,
      },
      store: false,
    });

    if (!response.output_text) throw new Error("EMPTY_AI_RESPONSE");
    return JSON.parse(response.output_text);
  }
}

export { model as geminiModel };