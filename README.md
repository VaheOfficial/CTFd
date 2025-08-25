# CTE Platform

A self-hosted CTF platform optimized for **Defensive Cyberspace Operations (DCO)** with optional OCO-lite challenges. Built with modern technologies and designed for single-server deployment.

## Features

### 🤖 **AI Challenge Generation**
- **GPT-5 + Claude Integration**: Dual-provider system with automatic fallback
- **Prompt-to-Challenge**: Generate complete challenges from natural language prompts
- **Deterministic Artifacts**: 11 built-in generators for realistic forensics scenarios
- **Schema Validation**: Strict JSON validation ensures consistent challenge structure
- **Safety Controls**: Content filtering and rate limiting for responsible AI use

### 🛡️ **DCO-First Design**
- **Short challenges** (20-60 min) focused on threat detection and defensive operations
- **Artifact-driven**: PCAP, logs, memory dumps, binaries, email samples, cloud configs
- **Deliverable system**: Accept Sigma rules, YARA rules, KQL queries, and analysis reports
- **Blue Star/Red Spark** badge system for defensive vs offensive achievements

### 🔐 **Security & Operations**
- **Dynamic HMAC flags**: User-specific flags prevent sharing
- **Validator containers**: Sandboxed execution with network isolation
- **Live labs**: Optional ephemeral Docker environments via Kasm/VPN
- **Rate limiting**: Comprehensive rate limiting on submissions, hints, and AI generation
- **Audit logging**: Full activity tracking for admin actions

### 🏆 **Gamification**
- **Seasonal structure**: 8-week seasons with weekly challenge drops
- **Leaderboards**: Live scoring with tie-breaking rules
- **Badge system**: First blood, streaks, deliverable achievements
- **Hint system**: Strategic point deductions for guided assistance
- **Email notifications**: Weekly drops, first blood alerts, leaderboard updates

### ⚡ **Admin Experience**
- **One-command publishing**: `make publish CHAL=path/to/challenge`
- **AI generation**: Paste prompt → get complete challenge with artifacts
- **Dry-run validation**: Test challenges before publishing
- **Automatic artifact uploads**: SHA256 verification and S3 storage
- **Season management**: Create seasons, weeks, and schedule challenges

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │   FastAPI API   │    │  Celery Worker  │
│   (Port 3000)   │────│   (Port 8000)   │────│   (Validators)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         │              │   PostgreSQL    │             │
         │              │   (Port 5432)   │             │
         │              └─────────────────┘             │
         │                                               │
         │              ┌─────────────────┐             │
         └──────────────│     Redis       │─────────────┘
                        │   (Port 6379)   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │     MinIO       │
                        │  (Ports 9000)   │
                        └─────────────────┘
```

## Tech Stack

### Backend
- **API**: FastAPI (Python 3.11) with SQLAlchemy ORM
- **Worker**: Celery for asynchronous task processing
- **Database**: PostgreSQL 15 with JSON support
- **Cache/Queue**: Redis for sessions and task queues
- **Storage**: MinIO (S3-compatible) for artifact storage
- **Auth**: JWT tokens with optional TOTP 2FA

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Language**: TypeScript with shared type definitions

### Infrastructure
- **Reverse Proxy**: Caddy with automatic HTTPS
- **Containers**: Docker Compose for orchestration
- **Networks**: Isolated networks for security (core-net, lab-net, ctegw)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- pnpm (Node.js package manager)
- Python 3.11+ (for scripts)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd cte-platform
cp env.example .env
```

### 2. Configure Environment

Edit `.env` file with your settings:

```bash
# Required - Change these!
DOMAIN=cte.yourdomain.com
HMAC_SECRET=your-32-char-secret-here-change-me
JWT_SECRET=your-jwt-secret-change-me

# Optional - Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional - Lab integrations
KASM_API_URL=https://kasm.yourdomain.com
KASM_API_TOKEN=your-kasm-token
WIREGUARD_ADAPTER_URL=https://wg-adapter.yourdomain.com
```

### 3. Start Development Environment

```bash
# Install dependencies
make install

# Start all services
make dev

# Seed database with admin user
make seed
```

### 4. Access the Platform

- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/api/docs
- **MinIO Console**: http://localhost:9001 (admin/password from .env)

**Default Login**: admin / admin123

## Challenge Development

### Challenge Structure

```
my-challenge/
├── challenge.yml      # Challenge metadata and configuration
├── artifacts/         # Files participants download
│   ├── pcap_file.pcap
│   └── logs.csv
├── validator/         # Custom validation logic (optional)
│   ├── Dockerfile
│   └── validate.py
├── docker/           # Live lab environment (optional)
│   ├── Dockerfile
│   └── docker-compose.yml
└── writeup.md        # Official solution
```

### challenge.yml Example

```yaml
id: "kerberoast-detector"
title: "Kerberoast Detector Tuning"
track: DETECT_FORENSICS
difficulty: MEDIUM
points:
  base: 200
time_cap_minutes: 45
mode: "solo"
window:
  open_relative_to_week: +0d
  close_relative_to_week: +7d

artifacts:
  - path: artifacts/sec_logs_4769.csv
    kind: csv
    sha256: "abcd1234..." # Auto-calculated if omitted

hints:
  - cost_percent: 15
    text: "Look for high serviceTicket counts over baseline."

flag:
  type: "dynamic_hmac"
  format: "flag{{}}"

validator:
  type: "container"
  image: "registry.local/validators/kerberoast:latest"
  cmd: ["python", "/app/validate.py", "--flag", "{FLAG}", "--seed", "{SEED}"]
  timeout_sec: 30
  network_policy: "none"

deliverables:
  - type: "rule"
    subtype: "sigma"
```

### Publishing Challenges

```bash
# Publish to current season
make publish CHAL=path/to/my-challenge

# Publish to specific season and week
python scripts/publish_challenge.py path/to/my-challenge --season season-id --week 3
```

## Administration

### User Management

```bash
# Access database
make db-shell

# Promote user to admin
UPDATE users SET role = 'ADMIN' WHERE username = 'username';
```

### Backup and Restore

```bash
# Create backup
make backup

# Restore from backup
make restore FILE=backups/cte_20240125_120000.dump
```

### Monitoring

```bash
# View logs
make logs

# Check worker status
make worker-status

# Clean up expired labs
make lab-cleanup
```

## Security Considerations

### Network Isolation
- **core-net**: API, database, Redis, MinIO
- **lab-net**: Isolated for challenge environments
- **ctegw**: Public-facing (Caddy only)

### Validator Sandboxing
- Containers run with `--network none`
- Resource limits (256MB RAM, 0.5 CPU)
- Read-only bind mounts for input
- 30-second timeout limits

### Authentication
- Argon2id password hashing
- JWT tokens with configurable expiration
- Optional TOTP 2FA support
- Rate limiting on login attempts

### Flag Security
- HMAC-based dynamic flags
- User-specific seeds
- Constant-time comparison

## Deployment

### Production Setup

1. **Server Requirements**
   - Ubuntu 20.04+ LTS
   - 4GB RAM minimum (8GB recommended)
   - 50GB storage minimum
   - Docker and Docker Compose

2. **Domain Setup**
   ```bash
   # Point DNS A record to your server IP
   cte.yourdomain.com → YOUR_SERVER_IP
   ```

3. **Deploy**
   ```bash
   # Build production images
   make build
   
   # Start in production mode
   make up
   
   # Run migrations
   make migrate
   
   # Seed initial data
   make seed
   ```

4. **SSL Certificate**
   Caddy automatically obtains Let's Encrypt certificates when `DOMAIN` is set.

### Maintenance

- **Updates**: `git pull && make build && make up`
- **Backups**: Automated via `make backup` (add to cron)
- **Logs**: Stored in Docker volumes, rotate as needed
- **Monitoring**: Built-in health checks via Docker

## Lab Integration

### Kasm Workspaces (Optional)

For browser-based lab access:

```bash
# Configure in .env
KASM_API_URL=https://kasm.yourdomain.com
KASM_API_TOKEN=your-api-token
```

### WireGuard VPN (Optional)

For network-level lab access:

```bash
# Configure in .env
WIREGUARD_ADAPTER_URL=https://wg-adapter.yourdomain.com
```

*Note: Kasm and WireGuard adapters use null implementations by default. Implement real integrations as needed.*

## Contributing

1. **Development Setup**
   ```bash
   make dev
   make seed
   ```

2. **Code Style**
   ```bash
   make lint
   make type-check
   ```

3. **Testing**
   ```bash
   make test
   ```

## Support

- **Documentation**: See `docs/` directory
- **API Reference**: http://localhost:8000/api/docs
- **Issues**: GitHub Issues
- **Security**: Email security@yourdomain.com

## License

[License Type] - See LICENSE file for details.

---

**Built for defenders, by defenders. 🛡️**
