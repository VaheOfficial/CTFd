FROM python:3.11-slim as base

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
FROM base as development
COPY apps/worker/ .
CMD ["celery", "worker", "-A", "main", "--loglevel=info", "--reload"]

# Production stage
FROM base as production
COPY apps/worker/ .
CMD ["celery", "worker", "-A", "main", "--loglevel=info"]
