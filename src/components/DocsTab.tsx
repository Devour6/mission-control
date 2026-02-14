"use client";

import { useState, useEffect } from "react";
import { DocsData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

const typeColors: Record<string, { bg: string; text: string }> = {
  intel: { bg: "bg-amber-500/20", text: "text-amber-400" },
  draft: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  analysis: { bg: "bg-cyan-400/20", text: "text-cyan-400" },
  report: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  memo: { bg: "bg-purple-400/20", text: "text-purple-400" },
  other: { bg: "bg-[#242836]", text: "text-[#8b8fa3]" },
};

interface MarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  loading: boolean;
}

function MarkdownModal({ isOpen, onClose, title, content, loading }: MarkdownModalProps) {
  if (!isOpen) return null;

  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-bold text-[#e4e6ed] mt-4 mb-2">{line.substring(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-bold text-[#e4e6ed] mt-6 mb-3">{line.substring(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold text-[#e4e6ed] mt-8 mb-4">{line.substring(2)}</h1>;
        }
        
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="text-[#c4c7d1] ml-4 mb-1">{line.substring(2)}</li>;
        }
        
        // Code blocks (simple detection)
        if (line.startsWith('```') || line.includes('`')) {
          return <pre key={i} className="bg-[#1a1d27] p-2 rounded text-[#8b8fa3] font-mono text-sm my-2 overflow-x-auto">{line}</pre>;
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={i} />;
        }
        
        // Regular text
        return <p key={i} className="text-[#c4c7d1] mb-2">{line}</p>;
      });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2e3345]">
          <h2 className="text-lg font-semibold text-[#e4e6ed] truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#8b8fa3] hover:text-[#e4e6ed] text-xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-[#8b8fa3] py-8">Loading...</div>
          ) : (
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(content)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocsTab() {
  const [data, setData] = useState<DocsData>({ days: [] });
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchData<DocsData>("docs.json").then(setData).catch(() => {});
    setMounted(true);
  }, []);

  const handleDocClick = async (doc: { title: string; url?: string; id: string }) => {
    // Google Drive links open in new tab
    if (doc.url && doc.url.includes('docs.google.com')) {
      window.open(doc.url, '_blank');
      return;
    }

    // Non-Drive docs open in modal via /api/doc endpoint or raw URL
    setModalTitle(doc.title);
    setModalOpen(true);
    setModalLoading(true);
    setModalContent('');

    try {
      const fetchUrl = doc.url || `/api/doc?id=${doc.id}`;
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const text = await response.text();
        setModalContent(text);
      } else {
        setModalContent('Error: Could not load document');
      }
    } catch {
      setModalContent('Error: Network error while loading document');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalTitle('');
    setModalContent('');
    setModalLoading(false);
  };

  if (!mounted) return null;

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-6">📄 Docs</h2>

        {data.days.length === 0 ? (
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
            No documents yet — the team will start producing docs as they work.
          </div>
        ) : (
          <div className="space-y-6">
            {data.days.map((day) => (
              <div key={day.date}>
                <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <span className="text-[10px] font-normal">({day.docs.length} docs)</span>
                </h3>
                <div className="space-y-2">
                  {day.docs.map((doc) => (
                    <div key={doc.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-lg p-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{doc.authorEmoji}</span>
                        <div>
                          <button
                            onClick={() => handleDocClick(doc)}
                            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer text-left"
                          >
                            {doc.title} {doc.url && doc.url.includes('docs.google.com') ? '↗' : ''}
                          </button>
                          <p className="text-xs text-[#8b8fa3] mt-0.5">{doc.description}</p>
                          <p className="text-[10px] text-[#8b8fa3] mt-1">by {doc.author}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${(typeColors[doc.type] || typeColors.other).bg} ${(typeColors[doc.type] || typeColors.other).text}`}>
                        {doc.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MarkdownModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        content={modalContent}
        loading={modalLoading}
      />
    </>
  );
}