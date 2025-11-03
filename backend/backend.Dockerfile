# ========================================
#   Backend Dockerfile  — FastAPI + OCR
# ========================================
FROM python:3.11-slim

# Use HTTPS Debian mirrors and install required system libs
RUN echo "deb https://deb.debian.org/debian trixie main contrib non-free" > /etc/apt/sources.list && \
    echo "deb https://deb.debian.org/debian-security trixie-security main contrib non-free" >> /etc/apt/sources.list && \
    echo "deb https://deb.debian.org/debian trixie-updates main contrib non-free" >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr-all \
        poppler-utils \
        libgl1 \
        zbar-tools \
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of backend source code
COPY backend/ /app/

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI app
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
