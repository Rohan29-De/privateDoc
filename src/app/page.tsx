"use client";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

import pdfToText from "react-pdftotext";



const Document = dynamic(() => import("react-pdf").then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), { ssr: false });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceText, setSourceText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("react-pdf").then((mod) => {
        mod.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
      });
    }
  }, []);

  // highlight matched text in the rendered PDF after answer/source updates
useEffect(() => {
  if (!answer) return;

  const clean = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]/g, "");

  const normalizedAnswer = clean(answer);

  const timeout = setTimeout(() => {
    const spans = document.querySelectorAll(
      ".react-pdf__Page__textContent span"
    );

    spans.forEach((span) => {
      if (!(span instanceof HTMLElement)) return;

      span.classList.remove("highlight-span");

      const text = span.textContent?.trim() || "";
      const normalizedSpan = clean(text);

      if (
        normalizedSpan.length > 4 &&
        normalizedAnswer.includes(normalizedSpan)
      ) {
        span.classList.add("highlight-span");
      }
    });
  }, 500);

  return () => clearTimeout(timeout);
}, [answer]);
  const handleUpload = async (selectedFile?: File) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) return;

    setPdfFile(fileToUpload);

    try {
      setStatus("Extracting text from PDF...");

      const extractedText = await pdfToText(fileToUpload);

      if (!extractedText || extractedText.length < 50) {
        setStatus("PDF does not contain readable text.");
        return;
      }

      setStatus("Sending document to server...");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`Success. Processed ${data.chunks} chunks.`);
        setSummary(data.summary);
      } else {
        setStatus(data.error || "Upload failed.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Error processing PDF.");
    }
  };

  const askQuestion = async () => {
  if (!question) return;

  console.log("Asking question:", question);
  setStatus("Thinking...");

  try {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    console.log("Query response:", data);

    if (res.ok) {
      setAnswer(data.answer);
      setSourceText(data.source || "");
      setStatus(`Confidence: ${data.confidence}`);
    } else {
      setStatus(data.error || "Query failed");
    }
  } catch (err) {
    console.error("Ask error:", err);
    setStatus("Error occurred");
  }
};

  return (
    <div className="h-screen grid grid-cols-2 bg-gray-100 overflow-hidden">

      {/* LEFT PANEL */}
      <div className="bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">

        {/* Navbar */}
        <div className="p-4 flex justify-between items-center bg-[#00cc00]">
          <h1 className="text-lg font-semibold text-black">
            PrivateDoc AI
          </h1>
          <div className="flex gap-2 items-center">

            {/* Hidden File Input */}
            <input
              type="file"
              accept="application/pdf"
              id="pdfUpload"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) {
                  setFile(selected);
                  handleUpload(selected);
                }
              }}
            />

            {/* Upload Button */}
            <button
              onClick={() => document.getElementById("pdfUpload")?.click()}
              className="text-sm px-4 py-1 bg-[#000000] text-white rounded-md hover:opacity-90 transition"
            >
              Upload
            </button>

            {/* Download Button (future use) */}
            <button
              className="text-sm px-4 py-1 bg-[#32cdf5] text-black rounded-md hover:opacity-90 transition"
            >
              Download
            </button>

            {/* Delete Button */}
            <button
              onClick={() => {
                setFile(null);
                setPdfFile(null);
                setSummary("");
                setAnswer("");
              }}
              className="text-sm px-4 py-1 bg-[#ff0040] text-white rounded-md hover:opacity-90 transition"
            >
              Delete
            </button>

          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-6 space-y-6 overflow-hidden">

          {/* Summary Box */}
          {summary && (
  <div className="bg-[#bfbfbf] p-5 rounded-lg border border-gray-400 shadow-sm flex flex-col h-[300px]">
    <h2 className="font-semibold text-gray-800 mb-3">
      Summary
    </h2>

    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed overflow-y-auto">
      {summary
        .split("\n")
        .filter(line => !line.includes("?"))
        .join("\n")}
    </div>
  </div>
)}

          {/* Floating Suggested Questions */}
          {summary && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                Suggested Questions
              </h3>

              <div className="flex flex-wrap gap-3">
                {summary
                  .split("\n")
                  .filter((line) => line.includes("?"))
                  .slice(0, 2)
                  .map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(q)}
                      className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-200 hover:bg-blue-100 transition shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
              </div>
            </div>
          )}

        </div>

        {/* Ask Section */}
        <div className="p-6 border-t border-gray-200">
          <div className="relative">
            <textarea
              placeholder="Ask about this document..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-4 pr-24 text-sm text-black placeholder-gray-500 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
            />
            <button
              onClick={askQuestion}
              className="absolute right-3 bottom-3 bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition text-sm"
            >
              Ask
            </button>
          </div>
        </div>
      </div>

  {/* RIGHT PANEL */}
      <div className="flex flex-col h-full overflow-hidden">

  {/* Answer Box - Fixed */}
  <div className="p-4 border-b border-gray-300 bg-white">
    {answer ? (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-2">Answer</h3>
        <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
          {answer}
        </p>
      </div>
    ) : (
      <div className="text-gray-400 text-sm">
        No question asked yet
      </div>
    )}
  </div>

  {/* PDF Scroll Area */}
  <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-100">
    {pdfFile ? (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex justify-center">
        <Document
          file={pdfFile}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from(new Array(numPages || 0), (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={600}
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          ))}
        </Document>
      </div>
    ) : (
      <div className="flex items-center justify-center h-full text-gray-400">
        No document uploaded
      </div>
    )}
  </div>

</div>
    </div>
  );
}
