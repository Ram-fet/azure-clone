import { useState } from "react";
import { apiPost } from "../api";

export default function useOCR() {
  const [ocrResults, setOcrResults] = useState({ blocks: [], matches: [] });
  const [ocrMeta, setOcrMeta] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runOCR = async (file, page, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name || "document.pdf");
      formData.append("page", page);

      formData.append("analysisRange", options.analysisRange || "current");
      formData.append("pageRange", options.pageRange || "all");
      formData.append("barcodes", options.barcodes ? "true" : "false");
      formData.append("language", options.language ? "true" : "false");
      formData.append("highRes", options.highRes ? "true" : "false");
      formData.append("styleFont", options.styleFont ? "true" : "false");
      formData.append("formulas", options.formulas ? "true" : "false");
      formData.append("layout", options.layout || "paragraph");

      if (options.searchText) {
        formData.append("searchText", options.searchText);
      }

      const data = await apiPost("/ocr", formData, true);

      setOcrResults({
        blocks: data.ocr_results || [],
        matches: data.search_matches || [],
      });

      setOcrMeta(
        data.page_size
          ? { width: data.page_size[0], height: data.page_size[1] }
          : null
      );

      setOcrText(data.extracted_text || "");
    } catch (err) {
      console.error("OCR failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { ocrResults, ocrMeta, ocrText, loading, error, runOCR };
}
