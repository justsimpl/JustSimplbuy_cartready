FROM python:3.11-slim

WORKDIR /app

# Local/docker-compose image: install runtime deps without unavailable PyPI packages.
COPY requirements.txt requirements.full.txt
RUN grep -v '^emergentintegrations' requirements.full.txt > requirements.txt \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
