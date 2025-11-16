"""FastAPI main application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api import transactions, accounts, analytics, export, import_router, summary

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title="FinStrive API",
    description="Self-hosted finance web application API",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transactions.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(import_router.router, prefix="/api")
app.include_router(summary.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "FinStrive API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )

