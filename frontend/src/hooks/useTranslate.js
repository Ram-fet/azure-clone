import { apiPost } from "../api";

export default function useTranslate() {
  const translateOne = async (text, tgt_lang = "en", src_lang = "auto") => {
    if (!text || !text.trim()) {
      return ""; // avoid sending invalid request
    }

    const data = await apiPost("/translate", {
      text: String(text),   // ensure backend always gets a string
      tgt_lang,
      src_lang,
    });
    return data.translated_text;
  };

  const translateMany = async (texts, tgt_lang = "en", src_lang = "auto") => {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const cleanTexts = texts.map((t) => String(t));
    const data = await apiPost("/translate", {
      text: cleanTexts,     // backend supports list too
      tgt_lang,
      src_lang,
    });
    return Array.isArray(data.translated_text)
      ? data.translated_text
      : [data.translated_text];
  };

  return { translateOne, translateMany };
}
