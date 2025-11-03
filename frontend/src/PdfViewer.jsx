import React, { useState } from "react";

function PDFViewer({ fileUrl }) {
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOCR = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: fileUrl }), // Or send file bytes if needed
      });
      const data = await response.json();
      setOcrText(data.text || "No text detected.");
    } catch (error) {
      console.error("OCR failed:", error);
      setOcrText("Error running OCR.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-viewer-container">
      {/* Your existing PDF.js / react-pdf viewer here */}

      <button onClick={handleOCR} disabled={loading} className="ocr-button">
        {loading ? "Running OCR..." : "Run OCR"}
      </button>

      {ocrText && (
        <div className="ocr-results">
          <h3>OCR Results</h3>
{/*           <pre>{ocrText}</pre>
 */}        </div>
      )}
    </div>
  );
}

export default PDFViewer;
