import io
import os
import re
import time
import uuid
import logging
from typing import List, Optional, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageSequence
from pdf2image import convert_from_bytes
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import torch
from contextlib import nullcontext

# -----------------------------
# Optional HEIC/HEIF support (pip install pillow-heif)
# -----------------------------
try:
    import pillow_heif  # noqa: F401
    HEIF_ENABLED = True
except Exception:
    HEIF_ENABLED = False

# -----------------------------
# Logging setup
# -----------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("ocr.server")

# -----------------------------
# Config
# -----------------------------
POPPLER_PATH = os.environ.get("POPPLER_PATH", None)
MODEL_NAME = "microsoft/trocr-base-handwritten"
TRUNCATE_LOG_CHARS = int(os.environ.get("TRUNCATE_LOG_CHARS", "240"))  # per-line log
PDF_MAGIC = b"%PDF"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".heic", ".heif"}

# -----------------------------
# TrOCR init (optimized)
# -----------------------------
logger.info("Loading TrOCR model: %s", MODEL_NAME)
processor = TrOCRProcessor.from_pretrained(MODEL_NAME)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)

device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
model.eval()

# speed/quality knobs (tweak via env if you want)
GEN_KW = {
    "max_new_tokens": int(os.environ.get("TROCR_MAXTOK", "128")),
    "num_beams": int(os.environ.get("TROCR_BEAMS", "3")),
    "early_stopping": True,
    "no_repeat_ngram_size": int(os.environ.get("TROCR_NGRAM", "3")),
}
logger.info("TrOCR model loaded on device=%s", device)

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(title="OCR with TrOCR", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Helpers
# -----------------------------
def render_pdf_to_images(pdf_bytes: bytes) -> List[Image.Image]:
    kwargs = {}
    if POPPLER_PATH:
        kwargs["poppler_path"] = POPPLER_PATH
    # dpi=200 ~ balanced; bump to 300 for harder handwriting (slower)
    return convert_from_bytes(pdf_bytes, dpi=200, **kwargs)

def load_images_from_bytes(file_bytes: bytes) -> List[Image.Image]:
    """
    Load 1..N PIL images from bytes.
      - Supports multi-frame TIFF
      - Converts to RGB for stable OCR
      - If pillow-heif is installed, HEIC/HEIF works too
    """
    img = Image.open(io.BytesIO(file_bytes))
    frames = []
    try:
        # Multi-frame (e.g., TIFF)
        for frame in ImageSequence.Iterator(img):
            frames.append(frame.convert("RGB"))
        if not frames:
            frames = [img.convert("RGB")]
    except Exception:
        frames = [img.convert("RGB")]
    return frames

def pil_to_cv(img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def cv_to_pil(img: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

def find_line_boxes(cv_img: np.ndarray) -> List[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    bw = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
    dil = cv2.dilate(bw, kernel, iterations=1)
    contours, _ = cv2.findContours(dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 30 and h > 15:
            boxes.append((x, y, w, h))
    boxes.sort(key=lambda b: (b[1], b[0]))
    return boxes

def _truncate_for_log(s: str, limit: int = TRUNCATE_LOG_CHARS) -> str:
    if s is None:
        return ""
    return (s[:limit] + "…") if len(s) > limit else s

def _guess_ext(name: str) -> str:
    name = (name or "").lower().strip()
    _, ext = os.path.splitext(name)
    return ext

def _is_pdf(filename: str, first_bytes: bytes) -> bool:
    return filename.endswith(".pdf") or first_bytes[:4] == PDF_MAGIC

# -----------------------------
# TrOCR recognition (batched)
# -----------------------------
def trocr_read_batch(pil_images: List[Image.Image]) -> List[str]:
    """
    Run TrOCR on a list of PIL RGB images in one go.
    Returns a list of decoded strings, same order.
    """
    if not pil_images:
        return []

    with torch.no_grad():
        amp_ctx = torch.autocast(device_type="cuda", dtype=torch.float16) if device == "cuda" else nullcontext()
        with amp_ctx:
            pixel_values = processor(images=pil_images, return_tensors="pt").pixel_values.to(device)
            generated_ids = model.generate(pixel_values, **GEN_KW)
        texts = processor.batch_decode(generated_ids, skip_special_tokens=True)
    return [t.strip() for t in texts]

def search_hits(blocks, query: str):
    if not query:
        return None
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    return [b for b in blocks if pattern.search((b.get("text") or ""))]

# -----------------------------
# Endpoint
# -----------------------------
@app.post("/ocr")
async def ocr_endpoint(
    request: Request,
    file: UploadFile = File(...),
    searchText: Optional[str] = Form(None),
    barcodes: Optional[bool] = Form(False),   # optional flag for barcode scanning (placeholder)
):
    req_id = str(uuid.uuid4())[:8]
    t0 = time.time()

    content = await file.read()
    filename = (file.filename or "uploaded_file")
    name_lower = filename.lower()
    ext = _guess_ext(name_lower)
    is_pdf = _is_pdf(name_lower, content)

    logger.info("[%s] /ocr START filename=%s type=%s searchText=%s",
                req_id, filename, "PDF" if is_pdf else "IMAGE", repr(searchText))

    try:
        # Render first page/frame for parity with your original shape
        if is_pdf:
            pil_pages = render_pdf_to_images(content)
        else:
            pil_pages = load_images_from_bytes(content)

        if not pil_pages:
            raise ValueError("No pages/frames could be loaded from input.")

        page = 1
        pil_page = pil_pages[0]
        width, height = pil_page.size

        cv_page = pil_to_cv(pil_page)
        boxes = find_line_boxes(cv_page)

        # Collect crops for batch OCR
        crops_pil: List[Image.Image] = []
        coords: List[Tuple[int, int, int, int]] = []
        for (x, y, bw, bh) in boxes:
            crop = cv_page[y:y+bh, x:x+bw]
            pil_crop = cv_to_pil(crop)
            crops_pil.append(pil_crop)
            coords.append((x, y, bw, bh))

        # Batched recognition
        try:
            texts = trocr_read_batch(crops_pil)
        except Exception as e:
            logger.exception("[%s] Batched OCR error: %s", req_id, str(e))
            texts = [""] * len(crops_pil)

        results = []
        for (x, y, bw, bh), text in zip(coords, texts):
            logger.debug(
                "[%s] OCR page=%d box=(x=%d,y=%d,w=%d,h=%d) text=\"%s\"",
                req_id, page, x, y, bw, bh, _truncate_for_log(text)
            )
            results.append({
                "text": text,
                "box": {"x": int(x), "y": int(y), "w": int(bw), "h": int(bh)},
                "page": page,
            })

        search_matches = search_hits(results, searchText)
        barcode_results = []   # placeholder: integrate pyzbar/zxing if needed

        elapsed = time.time() - t0
        logger.info("[%s] /ocr DONE page=%d boxes=%d size=(%dx%d) total=%.3fs matches=%d",
                    req_id, page, len(results), width, height, elapsed,
                    0 if search_matches is None else len(search_matches))
        logger.info("[%s]",  (results))
        return {
            "ocr_results": results,
            "search_matches": search_matches if searchText else None,
            "barcode_results": barcode_results if barcodes else None,
            "page_size": [width, height],
            "page": page,
            "extracted_text": "\n\n".join([r["text"] for r in results]),
        }

    except Exception as e:
        logger.exception("[%s] /ocr FAILED: %s", req_id, str(e))
        return {
            "ocr_results": [],
            "search_matches": None,
            "barcode_results": None,
            "page_size": [0, 0],
            "page": 0,
            "extracted_text": "",
        }

@app.get("/health")
def health():
    return {"status": "ok"}
