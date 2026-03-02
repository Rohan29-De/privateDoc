export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getStore } from "../../../lib/vectorStore";
import { askGroq } from "../../../lib/groq";

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreChunk(question: string, content: string) {
  const q = normalize(question);
  const c = normalize(content);

  const qWords = q.split(" ");
  const cWords = c.split(" ");

  let score = 0;

  for (const word of qWords) {
    if (word.length > 2) {
      const occurrences = cWords.filter(w => w === word).length;
      score += occurrences;
    }
  }

  if (c.includes(q)) {
    score += 5;
  }

  return score;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const store = getStore();

    if (!store.length) {
      return NextResponse.json({ error: "No document uploaded" }, { status: 400 });
    }

    const scored = store.map((item) => ({
      content: item.content,
      score: scoreChunk(question, item.content),
    }));

    scored.sort((a, b) => b.score - a.score);

    const topChunks = scored.slice(0, 3);

    if (topChunks[0].score === 0) {
      return NextResponse.json({
        answer: "The document does not contain this information.",
        confidence: "low",
      });
    }

    const context = topChunks
      .map((c, i) => `Source ${i + 1}:\n${c.content}`)
      .join("\n\n");

   const prompt = `
You are a document-grounded AI assistant.

Answer the question ONLY using the provided context.

Rules:
- If the answer is explicitly present in the context, return it clearly.
- If the answer is NOT explicitly present in the context, respond EXACTLY with:
  "The document does not contain this information."
- Do NOT guess.
- Do NOT infer.
- Do NOT use outside knowledge.
- Do NOT explain reasoning.
- Keep the answer concise and factual.

Context:
${topChunks.map(c => c.content).join("\n\n")}

Question:
${question}

Answer:
`;

    const answer = await askGroq(prompt);

    return NextResponse.json({
      answer,
      confidence: topChunks[0].score,
      source: topChunks[0].content,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}