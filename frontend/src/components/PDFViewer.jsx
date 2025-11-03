import React from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.mjs`;

function PDFViewer({ file, pageNumber, scale, onLoadSuccess }) {
  return (
    <Document file={file || "/sample.pdf"} onLoadSuccess={onLoadSuccess}>
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={false}   // ✅ no duplicate text
        renderAnnotationLayer={false} // ✅ no extra annotations
      />
    </Document>
  );
}

export default PDFViewer;
