# ---------------------------------------------------------------------------
# TRACE AI Engine — Flask + EasyOCR (PyTorch), Prophet, scikit-learn
#
# Targets linux/arm64 (Oracle Cloud Ampere). Note that no CPU-only torch index
# is needed here: the CUDA builds are x86_64-only, so the default aarch64
# wheels on PyPI are already CPU-only.
#
# Multi-stage: the Stan compiler toolchain that cmdstanpy/Prophet needs at
# install time is several hundred MB and is not needed at runtime.
# ---------------------------------------------------------------------------

# Python is pinned here because the repo pins none and torch 2.8 no longer
# supports the 3.9 that ships on the dev machine.
FROM python:3.12-slim AS builder

# g++/make are required to build cmdstanpy's Stan binary; the rest are for
# building any wheel that has no aarch64 build published.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential g++ make gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /install
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install/deps -r requirements.txt


FROM python:3.12-slim

# OpenCV needs libGL/libglib even in its headless build.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install/deps /usr/local

WORKDIR /app
COPY app.py ocr_engine.py ./

# Bake the EasyOCR detection + recognition models into the image. They are
# ~100 MB and ocr_engine.py builds the Reader at import time, so without this
# every cold start would download them before the port opens — slow, and a
# hard failure in a network with restricted egress.
ENV EASYOCR_MODULE_PATH=/app/.EasyOCR
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

ENV PORT=5005 \
    PYTHONUNBUFFERED=1
EXPOSE 5005

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:5005/health || exit 1

# gunicorn, not app.run(): the Werkzeug dev server is single-threaded and
# explicitly not for production. Prophet and the Random Forest train per
# request, so the timeout is generous and the worker count deliberately low.
CMD ["gunicorn", "--bind", "0.0.0.0:5005", "--workers", "2", "--threads", "2", \
     "--timeout", "180", "--access-logfile", "-", "app:app"]
