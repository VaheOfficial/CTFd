.PHONY: help dev build seed clean publish snapshot backup restore logs

# Default target
help:
	@echo "CTE Platform - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make seed         - Seed database with admin user and sample data"
	@echo "  make logs         - View logs from all services"
	@echo "  make clean        - Stop and remove all containers"
	@echo ""
	@echo "Production:"
	@echo "  make build        - Build production images"
	@echo "  make up           - Start production environment"
	@echo "  make down         - Stop production environment"
	@echo ""
	@echo "Challenge Management:"
	@echo "  make publish CHAL=path/to/challenge - Publish a challenge"
	@echo "  make snapshot     - Generate leaderboard snapshot"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup       - Backup database and artifacts"
	@echo "  make restore FILE=backup.dump - Restore from backup"
	@echo "  make migrate      - Run database migrations"

# Development commands
dev:
	docker compose up --build

seed:
	docker compose exec api python scripts/seed.py

logs:
	docker compose logs -f

clean:
	docker compose down --volumes --remove-orphans
	docker system prune -f

# Production commands  
build:
	NODE_ENV=production docker compose build

up:
	NODE_ENV=production docker compose up -d

down:
	docker compose down

# Challenge management
publish:
ifndef CHAL
	@echo "Error: Please specify CHAL=path/to/challenge"
	@exit 1
endif
	python scripts/publish_challenge.py $(CHAL)

snapshot:
	docker compose exec api python -c "from src.routes.admin import generate_leaderboard_snapshot; generate_leaderboard_snapshot()"

# Database operations
migrate:
	docker compose exec api alembic upgrade head

# Backup and restore
backup:
	@mkdir -p backups
	@echo "Creating database backup..."
	docker compose exec postgres pg_dump -U cte cte > backups/cte_$(shell date +%Y%m%d_%H%M%S).dump
	@echo "Backing up MinIO data..."
	docker compose exec minio mc mirror --overwrite /data backups/minio_$(shell date +%Y%m%d_%H%M%S)/
	@echo "Backup completed: backups/"

restore:
ifndef FILE
	@echo "Error: Please specify FILE=backup.dump"
	@exit 1
endif
	@echo "Restoring database from $(FILE)..."
	cat $(FILE) | docker compose exec -T postgres psql -U cte -d cte
	@echo "Database restored"

# Install dependencies
install:
	pnpm install
	cd apps/api && pip install -r requirements.txt
	cd apps/worker && pip install -r requirements.txt

# Linting and type checking
lint:
	pnpm run lint
	cd apps/api && python -m flake8 src/
	cd apps/worker && python -m flake8 tasks/

type-check:
	pnpm run type-check
	cd apps/api && python -m mypy src/
	cd apps/worker && python -m mypy tasks/

# Testing
test:
	pnpm run test
	cd apps/api && python -m pytest
	cd apps/worker && python -m pytest

# Security
security-scan:
	@echo "Running security scans..."
	cd apps/api && safety check
	cd apps/worker && safety check
	pnpm audit

# Generate SSL certificates for development
certs:
	@mkdir -p infra/certs
	openssl req -x509 -newkey rsa:4096 -keyout infra/certs/key.pem -out infra/certs/cert.pem -days 365 -nodes -subj "/CN=localhost"

# Database shell
db-shell:
	docker compose exec postgres psql -U cte -d cte

# Redis shell  
redis-shell:
	docker compose exec redis redis-cli

# API shell
api-shell:
	docker compose exec api python

# Worker status
worker-status:
	docker compose exec worker celery -A main inspect active

# Lab cleanup
lab-cleanup:
	docker compose exec worker python -c "from tasks.labs import cleanup_expired_labs; cleanup_expired_labs.delay()"
