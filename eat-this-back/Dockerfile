FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# CPU-only PyTorch wheels (the default Linux wheels bundle CUDA and add ~2.5 GB)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# SAM 3 weights are cached here; mount a volume to persist across restarts.
ENV HF_HOME=/models

EXPOSE 8000
# Shell form so PaaS-injected $PORT (Zeabur, Railway, etc.) is honored
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
