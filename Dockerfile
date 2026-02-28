# ── Stage 1: build the React SPA ─────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# Output lands in /app/backend/static (via vite.config.ts)

# ── Stage 2: Python backend ─────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy built SPA from stage 1
COPY --from=frontend-build /app/backend/static ./static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
