"use client";

import { useState, useEffect } from "react";
import { DocsData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            <div className="prose prose-invert prose-sm max-w-none markdown-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: (props) => <h1 className="text-2xl font-bold text-[#e4e6ed] mt-8 mb-4" {...props} />,
                  h2: (props) => <h2 className="text-xl font-bold text-[#e4e6ed] mt-6 mb-3" {...props} />,
                  h3: (props) => <h3 className="text-lg font-bold text-[#e4e6ed] mt-4 mb-2" {...props} />,
                  p: (props) => <p className="text-[#c4c7d1] mb-2" {...props} />,
                  ul: (props) => <ul className="text-[#c4c7d1] ml-4 mb-2" {...props} />,
                  ol: (props) => <ol className="text-[#c4c7d1] ml-4 mb-2" {...props} />,
                  li: (props) => <li className="text-[#c4c7d1] mb-1" {...props} />,
                  pre: (props) => <pre className="bg-[#1a1d27] p-2 rounded text-[#8b8fa3] font-mono text-sm my-2 overflow-x-auto" {...props} />,
                  a: (props) => <a className="text-indigo-400 hover:text-indigo-300 underline" {...props} />,
                  strong: (props) => <strong className="font-semibold text-[#e4e6ed]" {...props} />,
                  em: (props) => <em className="italic text-[#e4e6ed]" {...props} />
                }}
              >
                {content}
              </ReactMarkdown>
              <style jsx>{`
                .markdown-content :global(code) {
                  background-color: #1a1d27;
                  padding: 0.125rem 0.25rem;
                  border-radius: 0.25rem;
                  color: #8b8fa3;
                  font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                  font-size: 0.875rem;
                }
                .markdown-content :global(pre code) {
                  display: block;
                  padding: 0.5rem;
                  margin: 0.5rem 0;
                  overflow-x: auto;
                  background-color: #1a1d27;
                }
              `}</style>
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

  const handleDocClick = async (doc: { title: string; url?: string; id: string; path?: string }) => {
    // Google Drive links are now handled directly via <a> tags, so this function 
    // should not be called for them. But keeping the check for safety.
    if (doc.url && doc.url.includes('docs.google.com')) {
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
        const errorText = response.status === 404 
          ? 'Document not found. The file may have been moved or is not yet available.'
          : `Error loading document (${response.status}). Please try again later.`;
        setModalContent(errorText);
      }
    } catch {
      setModalContent('Error: Network error while loading document. Please check your connection and try again.');
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
                          {doc.url && doc.url.includes('docs.google.com') ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer text-left inline-flex items-center gap-1"
                            >
                              {doc.title} <span className="text-xs">↗</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => handleDocClick(doc)}
                              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer text-left"
                            >
                              {doc.title}
                            </button>
                          )}
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