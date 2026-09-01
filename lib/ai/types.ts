import { z } from "zod";

export const documentCategories = [
  "digital_subscription", "bill", "vehicle", "product", "warranty",
  "document", "home", "family", "other",
] as const;

export const documentAnalysisSchema = z.object({
  documentType: z.string().trim().min(1).max(120).nullable(),
  category: z.enum(documentCategories),
  title: z.string().trim().max(240).nullable(),
  provider: z.string().trim().max(240).nullable(),
  amount: z.number().finite().nonnegative().nullable(),
  currency: z.string().trim().max(12).nullable(),
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  nextDueDate: z.string().date().nullable(),
  recurrence: z.string().trim().max(120).nullable(),
  description: z.string().trim().max(2000).nullable(),
  confidence: z.number().finite().min(0).max(1),
  extractedFields: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string().max(500)).max(30),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;

export type DocumentAnalysisInput = {
  fileName: string;
  fileType: string;
  content: Buffer;
  knownProviders?: { name: string; category: string }[];
};

export const documentAnalysisInstructions = [
  "Return only the structured analysis schema; do not return prose.",
  "Unknown fields must be null; never guess.",
  "Secrets and payment credentials must never be extracted.",
  "Do not extract or store CVV, password, PIN, access token, or full card numbers.",
].join(" ");

export interface DocumentAnalysisProvider {
  analyze(input: DocumentAnalysisInput): Promise<unknown>;
}