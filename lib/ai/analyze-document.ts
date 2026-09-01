import { documentAnalysisSchema, type DocumentAnalysis, type DocumentAnalysisInput } from "./types";
import { getDocumentAnalysisProvider } from "./provider";

export async function analyzeDocument(input: DocumentAnalysisInput): Promise<DocumentAnalysis> {
  const rawResult = await getDocumentAnalysisProvider().analyze(input);
  return documentAnalysisSchema.parse(rawResult);
}