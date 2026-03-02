"use client";
import ReactMarkdown from "react-markdown";
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

  useEffect(() => {
    if (!answer) return;
    const clean = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedAnswer = clean(answer);
    const timeout = setTimeout(() => {
      const spans = document.querySelectorAll(".react-pdf__Page__textContent span");
      spans.forEach((span) => {
        if (!(span instanceof HTMLElement)) return;
        span.classList.remove("highlight-span");
        const text = span.textContent?.trim() || "";
        const normalizedSpan = clean(text);
        if (normalizedSpan.length > 4 && normalizedAnswer.includes(normalizedSpan)) {
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
      setStatus("Analyzing...");
      const extractedText = await pdfToText(fileToUpload);
      if (!extractedText || extractedText.length < 50) {
        setStatus("PDF Read Error");
        return;
      }
      setStatus("Syncing...");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`Online: ${data.chunks} Chunks`);
        setSummary(data.summary);
      } else {
        setStatus("Upload Failed");
      }
    } catch (error) {
      console.error(error);
      setStatus("Error");
    }
  };

  const askQuestion = async () => {
    if (!question) return;
    setStatus("Thinking...");
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnswer(data.answer);
        setSourceText(data.source || "");
        setStatus(`Confidence: ${data.confidence}`);
      }
    } catch (err) {
      setStatus("Query Error");
    }
  };

  return (
    // Main Container using #222831
    <div className="h-dvh w-full grid grid-cols-2 bg-[#222831] font-sans text-[#EEEEEE] overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="flex flex-col h-full border-r border-[#393E46] bg-[#222831]">
        
        {/* Header using #393E46 */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#393E46] bg-[#222831]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00ADB5] rounded-md flex items-center justify-center text-[#222831] font-black">
              PD
            </div>
            <h1 className="text-sm font-bold tracking-widest text-[#EEEEEE]">
              PRIVATE<span className="text-[#00ADB5]">DOC</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => document.getElementById("pdfUpload")?.click()}
              className="px-4 py-1.5 bg-[#00ADB5] text-[#eeeeee] text-[11px] font-black rounded hover:opacity-90 transition active:scale-95 uppercase tracking-tighter"
            >
              Upload PDF
            </button>
            {pdfFile && (
              <button
                onClick={() => {
                  setFile(null);
                  setPdfFile(null);
                  setSummary("");
                  setAnswer("");
                  setStatus("");
                }}
                className="text-[#393E46] hover:text-red-400 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Status Chip using #00ADB5 */}
          {status && (
            <div className="inline-block px-3 py-1 rounded border border-[#00ADB5]/30 bg-[#00ADB5]/10 text-[#00ADB5] text-[10px] font-bold tracking-widest uppercase animate-pulse">
              {status}
            </div>
          )}

          {/* Summary Section */}
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#393E46] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ADB5]"></span>
              Intelligence Report
            </h2>
            {summary ? (
              <div className="bg-[#393E46]/30 rounded-lg p-5 border border-[#393E46] leading-relaxed max-h-[300px] overflow-y-auto prose prose-invert prose-cyan prose-sm">
                <ReactMarkdown>
                  {summary.split("**Suggested Questions:**")[0].trim()}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="py-12 border border-[#393E46] border-dashed rounded-lg flex items-center justify-center text-[#393E46] text-xs">
                No active document detected.
              </div>
            )}
          </section>

          {/* Suggested Questions */}
          {summary && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#393E46]">
                Quick Queries
              </h3>
              <div className="space-y-2">
                {summary
                  .split("\n")
                  .filter((line) => line.includes("?"))
                  .slice(0, 3)
                  .map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(q.replace(/^\d+\.\s*/, ""))}
                      className="w-full text-left text-[12px] bg-[#393E46]/20 text-[#EEEEEE]/70 px-4 py-3 rounded border border-[#393E46] hover:border-[#00ADB5] hover:text-[#00ADB5] transition duration-200 group flex justify-between items-center"
                    >
                      <span className="truncate">{q.replace(/^\d+\.\s*/, "")}</span>
                      <span className="opacity-0 group-hover:opacity-100">→</span>
                    </button>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* Input Footer */}
        <footer className="p-6 bg-[#222831] border-t border-[#393E46]">
          <div className="relative">
            <textarea
              placeholder="Ask a technical question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-[#393E46] rounded-lg p-4 pr-16 text-sm text-[#EEEEEE] placeholder-[#393E46] bg-[#393E46]/10 resize-none focus:outline-none focus:border-[#00ADB5] transition shadow-inner"
              rows={2}
            />
            <button
              onClick={askQuestion}
              disabled={!question || !pdfFile}
              className="absolute right-3 bottom-3 p-2.5 bg-[#00ADB5] text-[#222831] rounded hover:scale-105 disabled:bg-[#393E46] disabled:text-[#222831] transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </footer>
      </div>

      {/* RIGHT PANEL: Answer & PDF */}
      <div className="flex flex-col h-full bg-[#393E46]/10 overflow-hidden">
        
        {/* Answer Area */}
        <div className="p-6 h-[28%] min-h-[160px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#393E46]">Engine Response</h3>
            {answer && <span className="text-[9px] text-[#00ADB5] font-black border border-[#00ADB5] px-2 py-0.5 rounded tracking-tighter bg-[#00ADB5]/5">VERIFIED SOURCE</span>}
          </div>
          <div className="flex-1 bg-[#222831] border border-[#393E46] rounded-lg p-5 overflow-y-auto custom-scrollbar shadow-2xl">
            {answer ? (
              <div className="text-[#EEEEEE] text-[14px] leading-relaxed animate-in fade-in duration-500">
                {answer}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#393E46] text-[11px] font-bold tracking-widest uppercase">
                Ready for query...
              </div>
            )}
          </div>
        </div>

        {/* PDF Viewer Workspace */}
        <div className="flex-1 min-h-0 px-6 pb-6 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#393E46]">Document Workspace</h3>
             {numPages && <span className="text-[10px] text-[#00ADB5] font-bold opacity-60">[{numPages} PAGES]</span>}
          </div>
          
          {/* Scrollable PDF Area using #393E46 for background */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-[#393E46] bg-[#393E46] shadow-inner flex justify-center custom-scrollbar p-8">
            {pdfFile ? (
              <div className="shadow-[0_0_60px_rgba(0,0,0,0.5)] bg-[#EEEEEE] rounded-sm">
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<div className="text-[#EEEEEE] text-xs font-mono py-10">RENDERING PDF CORE...</div>}
                >
                  {Array.from(new Array(numPages || 0), (_, index) => (
                    <div key={`page_${index + 1}`} className="mb-4 last:mb-0 border-b border-[#393E46]">
                      <Page
                        pageNumber={index + 1}
                        width={600}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  ))}
                </Document>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[#222831]">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-20 text-[#EEEEEE]">No Content</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Highlight Color using #00ADB5 with transparency */
        .highlight-span {
          background-color: rgba(0, 173, 181, 0.3) !important;
          border-bottom: 2px solid #00ADB5;
          color: #222831 !important;
          font-weight: bold;
        }
        
        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #222831;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #393E46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00ADB5;
        }

        /* React PDF Layer adjustment */
        .react-pdf__Page__textContent {
          mix-blend-mode: darken;
        }
      `}</style>
    </div>
  );
}