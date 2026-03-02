"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import pdfToText from "react-pdftotext";

const Document = dynamic(() => import("react-pdf").then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), { ssr: false });

export default function Home() {
  useEffect(() => {
    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.pdfjs.version}/pdf.worker.min.js`;
    });
  }, []);
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [summary, setSummary] = useState("");

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

    setStatus("Thinking...");

    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();

    if (res.ok) {
      setAnswer(data.answer);
      setStatus(`Confidence: ${data.confidence}`);
    } else {
      setStatus(data.error || "Query failed");
    }
  };

  return (
    <div className="h-screen grid grid-cols-2 bg-gray-100">

      {/* LEFT PANEL */}
      <div className="bg-white border-r border-gray-200 flex flex-col overflow-hidden">

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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Summary Box */}
          {summary && (
            <div className="bg-[#bfbfbf] p-5 rounded-lg border border-gray-400 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">
                Summary
              </h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {summary}
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
                  .slice(0, 5)
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
              className="w-full border border-gray-300 rounded-lg p-4 pr-24 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
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
      <div className="overflow-y-auto p-6 bg-gray-100">
        {answer && (
          <div className="mb-6 bg-white border border-gray-200 rounded p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Answer</h3>
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
              {answer}
            </p>
          </div>
        )}

        {/* PDF Viewer Placeholder */}
        {pdfFile ? (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex justify-center">
    <Document
      file={pdfFile}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      loading={<p className="text-gray-500">Loading PDF...</p>}
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
  );
}