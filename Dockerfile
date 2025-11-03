########## FRONTEND ##########
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

########## BACKEND ##########
FROM python:3.11-slim AS backend
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr poppler-utils libgl1 zbar-tools && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /app/frontend/dist /app/static

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
