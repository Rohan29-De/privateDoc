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

Provide:
1. A short summary (5-7 sentences)
2. Key important details (bullet points)
3. 5 suggested questions someone might ask about this document

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