.PHONY: help dev build seed clean publish snapshot backup restore logs install install-js install-python venv-api venv-worker clean-venv

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
	@echo "Setup & Dependencies:"
	@echo "  make install      - Install all dependencies (JS + Python in venv)"
	@echo "  make install-js   - Install JavaScript dependencies only"
	@echo "  make install-python - Install Python dependencies in virtual environments"
	@echo "  make clean-venv   - Remove Python virtual environments"
	@echo "  make install-python-langchain - Install Python dependencies for LangChain"
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

clean: clean-venv
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
	@if [ -f "venv/bin/activate" ]; then \
		. venv/bin/activate && python scripts/publish_challenge.py $(CHAL); \
	else \
		python scripts/publish_challenge.py $(CHAL); \
	fi

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
install: install-js install-python install-python-langchain

install-js:
	pnpm install

install-python: venv-api venv-worker
	@echo "Installing Python dependencies in virtual environments..."
	cd apps/api && . venv/bin/activate && pip install -r requirements.txt
	cd apps/worker && . venv/bin/activate && pip install -r requirements.txt

install-python-langchain:
	@echo "Installing Python dependencies for LangChain..."
	cd apps/api && . venv/bin/activate && pip install -r src/langchain_agents/requirements.txt

# Create virtual environments
venv-api:
	@echo "Creating virtual environment for API..."
	cd apps/api && python3 -m venv venv
	cd apps/api && . venv/bin/activate && pip install --upgrade pip

venv-worker:
	@echo "Creating virtual environment for Worker..."
	cd apps/worker && python3 -m venv venv
	cd apps/worker && . venv/bin/activate && pip install --upgrade pip

# Clean virtual environments
clean-venv:
	@echo "Removing virtual environments..."
	rm -rf apps/api/venv
	rm -rf apps/worker/venv

# Linting and type checking
lint:
	pnpm run lint
	cd apps/api && . venv/bin/activate && python -m flake8 src/
	cd apps/worker && . venv/bin/activate && python -m flake8 tasks/

type-check:
	pnpm run type-check
	cd apps/api && . venv/bin/activate && python -m mypy src/
	cd apps/worker && . venv/bin/activate && python -m mypy tasks/

# Testing
test:
	pnpm run test
	cd apps/api && . venv/bin/activate && python -m pytest
	cd apps/worker && . venv/bin/activate && python -m pytest

# Security
security-scan:
	@echo "Running security scans..."
	cd apps/api && . venv/bin/activate && safety check
	cd apps/worker && . venv/bin/activate && safety check
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
