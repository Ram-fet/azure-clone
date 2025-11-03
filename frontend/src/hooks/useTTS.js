// src/hooks/useTTS.js
import { useEffect, useRef, useState } from "react";

export default function useTTS() {
  const synth = window.speechSynthesis;
  const utterRef = useRef(null);

  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    if (typeof window !== "undefined") {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [synth]);

  const speak = (text, opts = {}) => {
    if (!text) return;
    stop();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 1.0;
    u.pitch = opts.pitch ?? 1.0;
    u.volume = opts.volume ?? 1.0;
    if (opts.voiceName) {
      const v = voices.find((v) => v.name === opts.voiceName);
      if (v) u.voice = v;
    }
    u.onend = () => {
      setSpeaking(false);
      setPaused(false);
      setCurrentText("");
    };
    u.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      setCurrentText("");
    };
    utterRef.current = u;
    setSpeaking(true);
    setPaused(false);
    setCurrentText(text.slice(0, 80)); // preview snippet if you need
    synth.speak(u);
  };

  const pause = () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setPaused(true);
    }
  };

  const resume = () => {
    if (synth.paused) {
      synth.resume();
      setPaused(false);
    }
  };

  const stop = () => {
    if (synth.speaking || synth.paused) {
      synth.cancel();
    }
    setSpeaking(false);
    setPaused(false);
    setCurrentText("");
    utterRef.current = null;
  };

  return { speak, pause, resume, stop, speaking, paused, voices, currentText };
}
