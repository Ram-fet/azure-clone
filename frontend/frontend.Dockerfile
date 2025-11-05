# ========================================
#   Frontend Dockerfile — React + Vite + Nginx
# ========================================

# ----------- 1. Build Stage -----------
FROM node:20-alpine AS build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# ----------- 2. Runtime Stage (Nginx) -----------
FROM nginx:alpine

# ✅ Fix MIME types so mobile browsers don't download the app
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from Vite/React
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
