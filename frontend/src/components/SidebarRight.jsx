// src/components/SidebarRight.jsx
import React, { useMemo, useState } from "react";
import useTTS from "../hooks/useTTS";
import useTranslate from "../hooks/useTranslate";

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
);
const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
);

const LANGS = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
];

function reconstructFromBlocks(ocrResults) {
  const serverParagraph = ocrResults?.extracted_text;
  if (serverParagraph && serverParagraph.trim()) {
    return serverParagraph
      .split(/\n\s*\n/g)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const blocks =
    (ocrResults && (ocrResults.ocr_results || ocrResults.blocks)) || [];
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const full = blocks.map((b) => b.text || "").join(" ");
  return full
    .split(/\n\s*\n|(?<=\.)\s{1,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function SidebarRight({ ocrResults }) {
  const paragraphs = useMemo(() => reconstructFromBlocks(ocrResults), [ocrResults]);

  const [activeIdx, setActiveIdx] = useState(null);
  const [tgtLang, setTgtLang] = useState("en");
  const [translations, setTranslations] = useState({}); // idx -> translated text
  const [loadingIdx, setLoadingIdx] = useState(null);

  const { speak, pause, resume, stop, speaking, paused } = useTTS();
  const { translateOne } = useTranslate(); // calls http://127.0.0.1:8010 by default

  const handlePlay = (text, idx) => {
    setActiveIdx(idx);
    speak(text, { rate: 1.0 });
  };
  const handlePauseResume = () => (paused ? resume() : pause());
  const handleStop = () => { stop(); setActiveIdx(null); };

  const handleTranslate = async (text, idx) => {
    try {
      setLoadingIdx(idx);
      const out = await translateOne(text, tgtLang, "auto");
      setTranslations((m) => ({ ...m, [idx]: out }));
    } catch (e) {
      console.error("translate failed", e);
      setTranslations((m) => ({ ...m, [idx]: "(translation failed)" }));
    } finally {
      setLoadingIdx(null);
    }
  };

  return (
    <aside className="sidebar-right scroll-panel">
      {/* Sticky header */}
      <div className="sr-header">
        <h4>Extracted Text</h4>
        <div className="sr-controls">
          <label>Translate to:</label>
          <select value={tgtLang} onChange={(e) => setTgtLang(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body scrolls */}
      <div className="sr-body">
        {paragraphs.length === 0 ? (
          <p className="muted">No OCR results yet.</p>
        ) : (
          <div className="paragraph-list">
            {paragraphs.map((p, idx) => {
              const translated = translations[idx];
              const isActive = activeIdx === idx;
              const isLoading = loadingIdx === idx;

              return (
                <div key={idx} className={`paragraph-card ${isActive ? "active" : ""}`}>
                  <div className="card-actions">
                    <button className="btn-icon" title="Play" onClick={() => handlePlay(p, idx)}>
                      <PlayIcon />
                    </button>
                    {isActive && speaking && (
                      <>
                        <button className="btn-icon" title={paused ? "Resume" : "Pause"} onClick={handlePauseResume}>
                          <PauseIcon />
                        </button>
                        <button className="btn-icon" title="Stop" onClick={handleStop}>
                          <StopIcon />
                        </button>
                      </>
                    )}
                    <button
                      className="btn-icon"
                      title={`Translate to ${tgtLang.toUpperCase()}`}
                      onClick={() => handleTranslate(p, idx)}
                      disabled={isLoading}
                    >
                      {isLoading ? "…" : "🌐"}
                    </button>
                    {translated && (
                      <button className="btn-icon" title="Read translation" onClick={() => handlePlay(translated, idx)}>
                        🔊
                      </button>
                    )}
                  </div>

                  <div className="card-text">
                    <p className="paragraph-text">{p}</p>
                    {translated && (
                      <p className="paragraph-text translation"><em>{translated}</em></p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
