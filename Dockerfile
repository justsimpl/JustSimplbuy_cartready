FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

COPY backend/requirements.prod.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/emergentintegrations ./emergentintegrations
COPY backend/redis_cache.py backend/server.py ./

EXPOSE 8080

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}"]
