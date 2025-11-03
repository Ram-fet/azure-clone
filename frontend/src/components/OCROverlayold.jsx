import React from "react";

function OCROverlay({
  ocrResults,
  ocrMeta,
  pageNumber,
  showBoxes,
  hoveredBox,
  setHoveredBox,
}) {
  if (!ocrMeta || !showBoxes) return null;

  const pageCanvas = document.querySelector(
    `.react-pdf__Page[data-page-number="${pageNumber}"] canvas`
  );
  const renderedW = pageCanvas?.clientWidth || ocrMeta.width;
  const renderedH = pageCanvas?.clientHeight || ocrMeta.height;
  const scaleX = renderedW / ocrMeta.width;
  const scaleY = renderedH / ocrMeta.height;

  const renderBox = (box, key, color, bg) => {
    const [x0, y0, x1, y1] = box.box;
    const left = x0 * scaleX;
    const top = y0 * scaleY;
    const width = (x1 - x0) * scaleX;
    const height = (y1 - y0) * scaleY;

    return (
      <div
        key={key}
        className="ocr-box"
        style={{
          left,
          top,
          width,
          height,
          border: `2px solid ${color}`,
          background: bg,
        }}
        onMouseEnter={() => setHoveredBox({ ...box, left, top })}
        onMouseLeave={() => setHoveredBox(null)}
      />
    );
  };

  return (
    <div className="ocr-overlay">
      {/* Normal OCR blocks (paragraph/line/word depending on layout) */}
      {ocrResults.blocks.map((box, idx) =>
        renderBox(box, `block-${idx}`, "red", "rgba(255,0,0,0.15)")
      )}

      {/* Highlighted search matches (always word-level) */}
      {ocrResults.matches.map((box, idx) =>
        renderBox(box, `match-${idx}`, "orange", "rgba(255,200,0,0.4)")
      )}

      {hoveredBox && (
        <div
          className="ocr-tooltip"
          style={{
            left: hoveredBox.left,
            top: Math.max(0, hoveredBox.top - 28),
          }}
        >
          {hoveredBox.text}
        </div>
      )}
    </div>
  );
}

export default OCROverlay;
