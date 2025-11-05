# ==========================================================
# Stage 1 — Build frontend (React/Vite)
# ==========================================================
FROM node:18-slim AS frontend

WORKDIR /frontend
COPY frontend/ ./
RUN npm install && npm run build

# ==========================================================
# Stage 2 — Build backend (FastAPI)
# ==========================================================
FROM python:3.11-slim AS backend

WORKDIR /app

# Install system dependencies (Poppler, Tesseract)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code
COPY backend/ /app/

# Copy frontend build output
COPY --from=frontend /frontend/dist ./static

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Run FastAPI app
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
