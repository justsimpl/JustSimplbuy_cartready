FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.prod.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY emergentintegrations ./emergentintegrations
COPY redis_cache.py server.py ./

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
