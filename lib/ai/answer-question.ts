import { GoogleGenAI } from "@google/genai";

import type { LifeItem } from "../lifeos";

const model = "gemini-3.6-flash";
const maxItemsInContext = 300;

function buildContext(items: LifeItem[]) {
  return items
    .slice(0, maxItemsInContext)
    .map((item) => {
      const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
      const amountText = amount !== null && amount !== undefined && Number.isFinite(amount) ? `${amount} ${item.currency ?? "TRY"}` : "-";
      return [item.title ?? "Başlıksız", item.category ?? "other", item.provider ?? "-", amountText, item.next_due_date ?? "-", item.recurrence ?? "-", item.status ?? "active"].join(" | ");
    })
    .join("\n");
}

export async function answerLifeOSQuestion(apiKey: string, question: string, items: LifeItem[], today: string) {
  const client = new GoogleGenAI({ apiKey });
  const context = buildContext(items);
  const response = await client.interactions.create({
    model,
    input: [
      {
        type: "text",
        text: [
          "You are LifeOS's assistant. Answer ONLY using the data table below (pipe-separated: title | category | provider | amount | next_due_date | recurrence | status).",
          `Today's date (Europe/Istanbul) is ${today}.`,
          "Answer in Turkish, briefly (2-4 sentences), in plain conversational text — no markdown, no JSON.",
          "If the data doesn't contain what's needed to answer, say so honestly instead of guessing.",
          "Never invent amounts, dates, providers, or records that aren't in the table.",
          "",
          "DATA:",
          context || "(kayıt yok)",
          "",
          `SORU: ${question}`,
        ].join("\n"),
      },
    ],
    store: false,
  });

  if (!response.output_text) throw new Error("EMPTY_AI_RESPONSE");
  return response.output_text.trim();
}
