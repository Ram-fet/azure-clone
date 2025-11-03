# -*- coding: utf-8 -*-
"""
A lightweight translation agent (FastAPI) using Hugging Face MarianMT models.

Endpoints:
  - POST /translate         : translate a string or list of strings
  - GET  /languages         : supported ISO-like short codes (OPUS-MT aliases)
  - GET  /health            : liveness
"""

import os
import logging
from functools import lru_cache
from typing import List, Union, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transformers import pipeline
import torch

# Optional language detection (pip install langdetect)
DETECT_ENABLED = True
try:
    from langdetect import detect as _detect_lang  # heuristic, not perfect
except Exception:
    DETECT_ENABLED = False
    _detect_lang = None

# -----------------------------
# Logging
# -----------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("translate.agent")

# -----------------------------
# Device
# -----------------------------
device = 0 if torch.cuda.is_available() else -1
logger.info("Translate agent device: %s", "cuda" if device == 0 else "cpu")

# -----------------------------
# Language aliases (OPUS-MT names)
# Add more codes if you need them.
# -----------------------------
LANG_ALIASES = {
    "en": "en", "fr": "fr", "es": "es", "de": "de", "it": "it", "pt": "pt",
    "nl": "nl", "sv": "sv", "no": "no", "da": "da", "fi": "fi",
    "ru": "ru", "uk": "uk", "pl": "pl", "cs": "cs", "sk": "sk",
    "ro": "ro", "bg": "bg", "el": "el", "tr": "tr",
    "ar": "ar", "fa": "fa", "he": "he",
    "hi": "hi", "bn": "bn", "ta": "ta", "te": "te",
    "zh": "zh", "ja": "ja", "ko": "ko",
}

def _pair(src: str, tgt: str) -> str:
    return f"{LANG_ALIASES.get(src, src)}-{LANG_ALIASES.get(tgt, tgt)}"

# -----------------------------
# Model cache
# -----------------------------
@lru_cache(maxsize=32)
def get_translator(src: str, tgt: str):
    pair = _pair(src, tgt)
    model_id = f"Helsinki-NLP/opus-mt-{pair}"
    logger.info("Loading translation model: %s", model_id)
    return pipeline("translation", model=model_id, device=device)

# -----------------------------
# FastAPI app
# -----------------------------
app = FastAPI(title="Translation Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslateRequest(BaseModel):
    text: Union[str, List[str]]
    tgt_lang: str
    src_lang: Optional[str] = None        # pass "auto" or leave None to auto-detect
    max_length: Optional[int] = 512

class TranslateResponse(BaseModel):
    translated_text: Union[str, List[str]]
    src_lang: str
    tgt_lang: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/languages")
def languages():
    return {"languages": sorted(LANG_ALIASES.keys())}

def _detect(src_text: str) -> str:
    if not DETECT_ENABLED or not _detect_lang:
        return "en"  # fallback default; or raise if you prefer
    try:
        code = _detect_lang(src_text)  # returns like 'en','fr','de',...
        return LANG_ALIASES.get(code, code)
    except Exception:
        return "en"

@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    texts = req.text if isinstance(req.text, list) else [req.text]
    if not texts:
        return TranslateResponse(translated_text=[], src_lang="en", tgt_lang=req.tgt_lang)

    # resolve src lang
    src = (req.src_lang or "").lower()
    if src in ("", "auto", None):
        # detect using the first non-empty sample
        sample = next((t for t in texts if t and t.strip()), "")
        src = _detect(sample) if sample else "en"

    tgt = req.tgt_lang.lower()
    translator = get_translator(src, tgt)

    outs = translator(
        texts,
        max_length=req.max_length or 512,
        clean_up_tokenization_spaces=True
    )
    results = [o["translation_text"] for o in outs]
    return TranslateResponse(
        translated_text=results if isinstance(req.text, list) else results[0],
        src_lang=src,
        tgt_lang=tgt,
    )
