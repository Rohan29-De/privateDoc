export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "../../../lib/utils";
import { addToStore, clearStore } from "../../../lib/vectorStore";
import { generateSummary } from "../../../lib/groq";
import { setSummary } from "../../../lib/vectorStore";

export async function POST(req: NextRequest) {
  try {
    clearStore();

    const { text } = await req.json();

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "Insufficient text extracted from PDF" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);

    for (const chunk of chunks) {
      addToStore({
        content: chunk,
        createdAt: Date.now(),
      });
    }

    const summaryText = await generateSummary(text);
    setSummary(summaryText);

    return NextResponse.json({
      message: "Document processed successfully",
      chunks: chunks.length,
      summary: summaryText,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}