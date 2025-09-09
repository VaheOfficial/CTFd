from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
import os

from src.database import engine, Base
from src.routes import auth, challenges, seasons, submissions, admin, artifacts, leaderboard, ai_challenge, two_factor, notifications
from src.utils.logging import setup_logging
from src.utils.logging import get_logger

# Setup logging
setup_logging()

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="CTE Platform API",
    description="Self-hosted CTF platform optimized for Defensive Cyberspace Operations",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    debug=True  # Enable debug mode
)

# Security middleware
security = HTTPBearer()

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    logger = get_logger(__name__)
    logger.info(f"Request: {request.method} {request.url.path}",
                headers=dict(request.headers),
                query_params=dict(request.query_params))
    
    # Try to log the body if it's JSON
    try:
        body = await request.json()
        logger.info("Request body:", body=body)
    except:
        pass
    
    response = await call_next(request)
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", f"https://{os.getenv('DOMAIN', 'localhost')}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
if domain := os.getenv("DOMAIN"):
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[domain, f"*.{domain}", "localhost", "127.0.0.1"]
    )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(two_factor.router, prefix="/api", tags=["Two-Factor Authentication"])
app.include_router(challenges.router, prefix="/api", tags=["Challenges"])
app.include_router(seasons.router, prefix="/api", tags=["Seasons"])
app.include_router(submissions.router, prefix="/api", tags=["Submissions"])
app.include_router(artifacts.router, prefix="/api", tags=["Artifacts"])
app.include_router(leaderboard.router, prefix="/api", tags=["Leaderboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(ai_challenge.router, prefix="/api", tags=["AI Generation"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "cte-api"}

@app.get("/api")
async def root():
    """API root endpoint"""
    return {
        "message": "CTE Platform API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=os.getenv("NODE_ENV") == "development"
    )
