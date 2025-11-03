import React, { useState, useMemo } from "react";
import TopBar from "./components/TopBar";
import SidebarLeft from "./components/SidebarLeft";
import SidebarRight from "./components/SidebarRight";
import PDFViewer from "./components/PDFViewer";
import OCROverlay from "./components/OCROverlay";
import PageControls from "./components/PageControls";
import ZoomControls from "./components/ZoomControls";
import AnalyzeOptionsModal from "./components/AnalyzeOptionsModal";
import useOCR from "./hooks/useOCR";
import { apiPost } from "./api";  
import "./style.css";

export default function App() {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [scale, setScale] = useState(1.2);
  const [darkMode, setDarkMode] = useState(false);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [analyzeOptions, setAnalyzeOptions] = useState({});

  const { ocrResults, ocrMeta, runOCR } = useOCR();

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  // --- NEW: tiny helper to detect PDFs ---
  const isPdf = (fObj) =>
    !!fObj &&
    (fObj.raw?.type === "application/pdf" ||
      (fObj.name || "").toLowerCase().endsWith(".pdf"));

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const newFile = {
        name: file.name,
        url: URL.createObjectURL(file),
        raw: file,
      };
      setFiles((prev) => [...prev, newFile]);
      setActiveFile(files.length);

      // If it's an image, we won't get a pdf.js onLoad callback, so lock pages to 1.
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setNumPages(1);
        setPageNumber(1);
      }
    }
  };

  const handleSelectFile = (idx) => {
    setActiveFile(idx);
    setPageNumber(1);
    const f = files[idx];
    if (f && !isPdf(f)) setNumPages(1); // images: single "page"
    else setNumPages(null); // PDFs: let pdf.js set it
  };

  const handleRunOCR = async () => {
    if (activeFile != null && files[activeFile]) {
      await runOCR(files[activeFile].raw, pageNumber, analyzeOptions);
    } else {
      const res = await fetch("/sample.pdf");
      const blob = await res.blob();
      await runOCR(blob, pageNumber, analyzeOptions);
    }
  };
  /*
const handleOpenAsHTML = async () => {
  // Pre-open WITHOUT noopener/noreferrer (Firefox returns null otherwise)
  const preTab = window.open("", "_blank"); // <- no features string

  try {
    let fileBlob, fileName = "document.pdf";
    if (activeFile != null && files[activeFile]?.raw) {
      fileBlob = files[activeFile].raw;
      fileName = files[activeFile].name || fileName;
    } else {
      alert("Please upload a PDF first.");
      preTab && preTab.close();
      return;
    }

    const form = new FormData();
    form.append("file", fileBlob, fileName);
    form.append("page_range", "all");

    const data = await apiPost("/pdf-to-html", form, true);

    const API_BASE = (import.meta?.env?.VITE_API_URL) || "http://localhost:8000";
    const url = data?.url?.startsWith("/") ? API_BASE + data.url : data?.url;

    if (!url) {
      preTab && preTab.close();
      alert("Server did not return a URL.");
      return;
    }

    // Navigate the pre-opened tab if we have it; fallback to opening directly
    if (preTab && !preTab.closed) {
      preTab.location.href = url;
    } else {
      // Popup was blocked or null because of browser policy → best-effort fallback
      window.open(url, "_blank");
    }
  } catch (e) {
    console.error(e);
    preTab && preTab.close();
    alert("Could not create HTML from this PDF. See console for details.");
  }
};
*/
function openInNewTabSafe(url) {
  // Try to open a new tab immediately (user gesture)
  const w = window.open("", "_blank"); // no features => Firefox returns a Window, not null
  if (w && !w.closed) {
    try {
      // avoid reverse tabnabbing
      w.opener = null;
      // navigate and focus
      w.location.replace(url);
      w.focus();
      return true;
    } catch {
      // fall through
    }
  }
  // Fallback for strict popup blockers
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return false;
}

const handleOpenAsHTML = async () => {
  // pre-open a tab (so browsers treat this as user-initiated)
  const preTab = window.open("", "_blank"); // no "noopener" here or Firefox returns null

  try {
    let fileBlob, fileName = "document.pdf";
    if (activeFile != null && files[activeFile]?.raw) {
      fileBlob = files[activeFile].raw;
      fileName = files[activeFile].name || fileName;
    } else {
      alert("Please upload a PDF first.");
      preTab && preTab.close();
      return;
    }

    const form = new FormData();
    form.append("file", fileBlob, fileName);
    form.append("page_range", "all");

    const data = await apiPost("/pdf-to-html", form, true);

    // If backend returns relative path, prefix it
    const API_BASE = (import.meta?.env?.VITE_API_URL) || "http://localhost:8000";
    const url = data?.url?.startsWith("/") ? API_BASE + data.url : data?.url;

    console.log("pdf-to-html URL:", url);
    if (!url) {
      preTab && preTab.close();
      alert("Server did not return a URL.");
      return;
    }

    if (preTab && !preTab.closed) {
      // Navigate the pre-opened tab
      preTab.opener = null;             // security
      preTab.location.replace(url);
      preTab.focus();
    } else {
      // Fallback (popup blocked or null)
      openInNewTabSafe(url);
    }
  } catch (e) {
    console.error(e);
    preTab && preTab.close();
    alert("Could not create/open HTML. See console for details.");
  }
};

  const currentFile = activeFile != null ? files[activeFile] : null;
  const currentUrl = currentFile ? currentFile.url : null;
  const currentIsPdf = useMemo(() => isPdf(currentFile), [currentFile]);

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      {/* Top Bar */}
      <TopBar
        onRun={handleRunOCR}
        onOpenOptions={() => setOptionsOpen(true)}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        showBoxes={showBoxes}
        toggleBoxes={() => setShowBoxes(!showBoxes)}
          onOpenHtml={handleOpenAsHTML}   // <-- add this line
      />

      <div className="main-layout">
        {/* Left Sidebar */}
        <SidebarLeft
          onFileUpload={handleFileUpload}
          files={files}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
        />

        {/* Center Viewer */}
        <div className="viewer-section">
          <div className="page-wrapper" style={{ position: "relative" }}>
            {/* Render PDF normally; render images as <img /> to avoid pdf.js error */}
            {currentUrl && currentIsPdf ? (
              <PDFViewer
                file={currentUrl}
                pageNumber={pageNumber}
                scale={scale}
                onLoadSuccess={onDocumentLoadSuccess}
              />
            ) : currentUrl ? (
              <img
                src={currentUrl}
                alt={currentFile?.name || "image"}
                style={{
                  maxWidth: `${Math.round(scale * 100)}%`,
                  width: "auto",
                  height: "auto",
                  display: "block",
                }}
              />
            ) : null}

            {/* OCR overlay stays as-is */}
            <OCROverlay
              ocrResults={ocrResults}
              ocrMeta={ocrMeta}
              pageNumber={pageNumber}
              showBoxes={showBoxes}
              hoveredBox={hoveredBox}
              setHoveredBox={setHoveredBox}
            />
          </div>

          {/* Controls */}
          <div className="bottom-controls">
            <PageControls
              pageNumber={pageNumber}
              numPages={numPages}
              onPrev={() => setPageNumber(pageNumber - 1)}
              onNext={() => setPageNumber(pageNumber + 1)}
              onRunOCR={handleRunOCR}
              showBoxes={showBoxes}
              toggleBoxes={() => setShowBoxes(!showBoxes)}
              onOpenHtml={handleOpenAsHTML}   
            />
            <ZoomControls scale={scale} setScale={setScale} />
          </div>
        </div>

        {/* Right Sidebar */}
        <SidebarRight ocrResults={ocrResults} />
      </div>

      {/* Analyze Options Modal */}
      <AnalyzeOptionsModal
        isOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onSave={(opts) => setAnalyzeOptions(opts)}
      />
    </div>
  );
}
