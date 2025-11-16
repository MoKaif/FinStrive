#!/bin/bash
# FinStrive Setup Script

set -e

echo "FinStrive Setup Script"
echo "======================"
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.11"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "Error: Python 3.11+ is required. Found: $python_version"
    exit 1
fi

echo "Python version: $(python3 --version)"
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel

# Check if Rust is installed (needed for pydantic-core)
if ! command -v rustc &> /dev/null; then
    echo "WARNING: Rust not found. pydantic-core may fail to build."
    echo "Install Rust with: sudo pacman -S rust cargo"
    echo "Or use system packages: sudo pacman -S python-pydantic python-fastapi"
    echo ""
fi

echo "Installing numpy first (build dependency)..."
pip install numpy>=1.26.0 || echo "Warning: numpy installation failed, continuing..."
echo "Installing remaining dependencies..."
pip install -r requirements.txt

echo "Initializing database..."
python3 -c "from app.database import init_db; init_db()"

cd ..
echo "Backend setup complete!"
echo ""

# Frontend setup
echo "Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

cd ..
echo "Frontend setup complete!"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ".env file created. Please edit it with your configuration."
else
    echo ".env file already exists."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "3. Start frontend: cd frontend && npm run dev"
echo "4. Import your ledger file using the web UI or API"

