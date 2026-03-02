export async function askGroq(prompt: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a strict document assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateSummary(text: string): Promise<string> {
  const shortText = text.slice(0, 8000); // limit token size

 const prompt = `
You are analyzing a document.

Return:

1. A short factual summary (5-7 sentences).
2. Key important details as bullet points.
3. EXACTLY 2 suggested questions.
4. Each suggested question must include exact wording that appears in the document.
Important rules for suggested questions:
- Each question MUST be answerable directly from the document.
- Do NOT create analytical, comparative, or opinion-based questions.
- Do NOT ask anything that requires outside knowledge.
- Only ask about information that is explicitly written in the document.
- Keep questions factual and specific.

Document:
${shortText}
`;

  return await askGroq(prompt);
}

// helper used by upload route to embed text chunks
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.groq.com/openai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq embedding error: ${err}`);
  }

  const result = await response.json();
  // assuming OpenAI-like response structure
  return result.data[0].embedding;
}