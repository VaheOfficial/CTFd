FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies including Docker CLI
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY apps/worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base AS development
COPY apps/worker/ .
CMD ["celery", "-A", "main", "worker", "--loglevel=info"]

# Production stage
FROM base AS production
COPY apps/worker/ .
CMD ["celery", "-A", "main", "worker", "--loglevel=info"]
