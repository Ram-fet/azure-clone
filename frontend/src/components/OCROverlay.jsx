import React from "react";

function OCROverlay({
  ocrResults,
  ocrMeta,
  pageNumber,
  showBoxes,
  hoveredBox,
  setHoveredBox,
}) {
  if (!showBoxes) return null;

  // ---------- Normalize results shape ----------
  // Support both old {blocks, matches} and new {ocr_results, search_matches}
  const blocks = (ocrResults && (ocrResults.blocks || ocrResults.ocr_results)) || [];
  const matches = (ocrResults && (ocrResults.matches || ocrResults.search_matches)) || [];

  // ---------- Detect viewer target (PDF canvas vs IMG) ----------
  // Try react-pdf page canvas first (PDF mode)
  const pageCanvas = document.querySelector(
    `.react-pdf__Page[data-page-number="${pageNumber}"] canvas`
  );

  // If no pdf.js canvas found, try to find an <img> inside the page wrapper (Image mode)
  const imgEl =
    pageCanvas
      ? null
      : document.querySelector(".viewer-section .page-wrapper img");

  const isPdfMode = !!pageCanvas;
  const isImageMode = !pageCanvas && !!imgEl;

  // ---------- Determine intrinsic and rendered sizes for scaling ----------
  let renderedW = 0,
    renderedH = 0,
    intrinsicW = 0,
    intrinsicH = 0;

  if (isPdfMode) {
    // pdf.js rendering: use canvas client size for rendered,
    // and fallback to ocrMeta for intrinsic (the OCR's coordinate space)
    renderedW = pageCanvas?.clientWidth || (ocrMeta?.width ?? 0);
    renderedH = pageCanvas?.clientHeight || (ocrMeta?.height ?? 0);
    intrinsicW = ocrMeta?.width ?? renderedW;
    intrinsicH = ocrMeta?.height ?? renderedH;
  } else if (isImageMode) {
    // image rendering: use <img> client size vs natural size
    renderedW = imgEl?.clientWidth || (ocrMeta?.width ?? 0);
    renderedH = imgEl?.clientHeight || (ocrMeta?.height ?? 0);
    intrinsicW = imgEl?.naturalWidth || (ocrMeta?.width ?? renderedW);
    intrinsicH = imgEl?.naturalHeight || (ocrMeta?.height ?? renderedH);
  } else {
    // fallback if neither found yet (initial render)
    renderedW = ocrMeta?.width ?? 0;
    renderedH = ocrMeta?.height ?? 0;
    intrinsicW = ocrMeta?.width ?? 1; // avoid div by zero
    intrinsicH = ocrMeta?.height ?? 1;
  }

  const scaleX = intrinsicW ? renderedW / intrinsicW : 1;
  const scaleY = intrinsicH ? renderedH / intrinsicH : 1;

  // ---------- Box format normalizer ----------
  // Accepts either { box: [x0,y0,x1,y1] } or { box: {x,y,w,h} }
  const toRect = (item) => {
    const b = item?.box;
    if (!b) return { x: 0, y: 0, w: 0, h: 0 };

    // Array format: [x0,y0,x1,y1]
    if (Array.isArray(b) || Array.isArray(b?.box)) {
      const arr = Array.isArray(b) ? b : b.box;
      const [x0, y0, x1, y1] = arr || [0, 0, 0, 0];
      return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
    }

    // Object format: {x,y,w,h}
    if (typeof b === "object") {
      const { x = 0, y = 0, w = 0, h = 0 } = b;
      return { x, y, w, h };
    }

    // Unknown format
    return { x: 0, y: 0, w: 0, h: 0 };
  };

  // ---------- Render a single overlay box ----------
  const renderBox = (box, key, color, bg) => {
    const { x, y, w, h } = toRect(box);

    const left = x * scaleX;
    const top = y * scaleY;
    const width = w * scaleX;
    const height = h * scaleY;

    return (
      <div
        key={key}
        className="ocr-box"
        style={{
          position: "absolute",
          left,
          top,
          width,
          height,
          border: `2px solid ${color}`,
          background: bg,
          boxSizing: "border-box",
          pointerEvents: "auto",
        }}
        onMouseEnter={() => setHoveredBox?.({ ...box, left, top })}
        onMouseLeave={() => setHoveredBox?.(null)}
      />
    );
  };

  // ---------- Overlay root ----------
  // Place absolutely over the same region as the rendered page/image
  const overlayStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: renderedW,
    height: renderedH,
    pointerEvents: "none", // lets clicks pass through unless box handles
  };

  return (
    <div className="ocr-overlay" style={overlayStyle}>
      {/* Normal OCR blocks */}
      {Array.isArray(blocks) &&
        blocks.map((box, idx) =>
          renderBox(box, `block-${idx}`, "red", "rgba(255,0,0,0.15)")
        )}

      {/* Highlighted search matches */}
      {Array.isArray(matches) &&
        matches.map((box, idx) =>
          renderBox(box, `match-${idx}`, "orange", "rgba(255,200,0,0.4)")
        )}

      {/* Tooltip */}
      {hoveredBox && (
        <div
          className="ocr-tooltip"
          style={{
            position: "absolute",
            left: hoveredBox.left ?? 0,
            top: Math.max(0, (hoveredBox.top ?? 0) - 28),
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 4,
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
            fontSize: 12,
          }}
        >
          {hoveredBox.text}
        </div>
      )}
    </div>
  );
}

export default OCROverlay;
