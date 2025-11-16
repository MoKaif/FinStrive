# FinStrive - Finance Web Application

A self-hosted, incremental finance web application for Arch Linux that ingests an existing Obsidian ledger (plain-text transactions.ledger), stores structured data in a lightweight database, provides on-demand Excel exports, and offers visual analysis with a clean aesthetic dashboard.

## Features

- **Ledger Import**: Parse and import transactions from ledger-cli format files
- **Transaction Management**: View, search, and filter transactions
- **Account Balances**: Tree view of all accounts with current balances
- **Analytics**: Monthly income/expense charts and category breakdowns
- **Excel Export**: Export filtered transactions to Excel format
- **REST API**: Full REST API for programmatic access
- **Self-Hosted**: All data stored locally, no external dependencies

## Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **SQLite**: Lightweight, file-based database
- **pandas/openpyxl**: Excel export functionality

### Frontend
- **React**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Charting library
- **Axios**: HTTP client

## Project Structure

```
FinStrive/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── services/         # Business logic services
│   │   ├── models.py         # Database models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── parser.py         # Ledger parser
│   │   ├── importer.py       # Import service
│   │   ├── database.py       # Database configuration
│   │   ├── config.py         # Configuration management
│   │   └── main.py           # FastAPI application
│   ├── alembic/              # Database migrations
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client
│   │   └── main.jsx          # Entry point
│   └── package.json          # Node dependencies
├── data/                     # Database storage (gitignored)
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Installation

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Arch Linux (or compatible Linux distribution)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Arch Linux
   ```

3. **Install dependencies:**
   ```bash
   pip install --upgrade pip setuptools wheel
   pip install numpy>=1.26.0  # Install numpy first as build dependency
   pip install -r requirements.txt
   ```
   
   **Note:** If you encounter errors on Arch Linux:
   
   - **For SQLAlchemy/Python 3.13 errors:** Ensure you're using SQLAlchemy >= 2.0.36:
     ```bash
     pip install --upgrade sqlalchemy>=2.0.36
     ```
   
   - **For pydantic-core errors (Rust required):** Install Rust:
     ```bash
     sudo pacman -S rust cargo
     ```
   
   - **For pandas build errors:** Install build dependencies:
     ```bash
     sudo pacman -S python-numpy python-cython gcc gcc-fortran
     ```
   
   - **Alternative:** Use system packages (see `backend/INSTALL_ARCH.md` for details):
     ```bash
     sudo pacman -S python-pydantic python-fastapi python-numpy python-pandas python-sqlalchemy
     ```

4. **Configure environment:**
   ```bash
   cp ../.env.example ../.env
   # Edit .env file with your settings
   ```

5. **Initialize database:**
   ```bash
   alembic upgrade head
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API URL (optional):**
   Create a `.env` file in the frontend directory:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

## Usage

### Running the Application

#### Backend

1. **Activate virtual environment:**
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. **Start the FastAPI server:**
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Or run directly:
   ```bash
   python -m app.main
   ```

   The API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Alternative docs: `http://localhost:8000/redoc`

#### Frontend

1. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

### Initial Import

1. **Ensure your ledger file path is configured in `.env`:**
   ```
   LEDGER_FILE_PATH=/home/nox/Nox/Finance/transactions.ledger
   ```

2. **Import transactions:**
   - Use the "Import Ledger" button in the web UI, or
   - Call the API endpoint:
     ```bash
     curl -X POST http://localhost:8000/api/import
     ```

### Systemd Service (Optional)

Create a systemd service file `/etc/systemd/system/finstrive.service`:

```ini
[Unit]
Description=FinStrive Finance Application
After=network.target

[Service]
Type=simple
User=nox
WorkingDirectory=/home/nox/Development/FinStrive/backend
Environment="PATH=/home/nox/Development/FinStrive/backend/venv/bin"
ExecStart=/home/nox/Development/FinStrive/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable finstrive
sudo systemctl start finstrive
```

## API Endpoints

### Transactions
- `GET /api/transactions` - List transactions with filters
- `GET /api/transactions/{id}` - Get single transaction

### Accounts
- `GET /api/accounts` - Get account tree with balances
- `GET /api/accounts/{account_path}/balance` - Get account balance

### Analytics
- `GET /api/analytics/monthly` - Monthly income/expense breakdown
- `GET /api/analytics/categories` - Category-wise expense breakdown

### Import/Export
- `POST /api/import` - Import ledger file
- `GET /api/export/excel` - Export transactions to Excel

## Configuration

Environment variables (`.env` file):

```bash
# Ledger file path
LEDGER_FILE_PATH=/home/nox/Nox/Finance/transactions.ledger

# Database URL
DATABASE_URL=sqlite:///./data/finstrive.db

# API Configuration
API_HOST=127.0.0.1
API_PORT=8000

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Ledger File Format

The application supports ledger-cli format files with:

- **Aliases**: `alias A=Assets` or `A=Assets`
- **Transactions**: Date format `YYYY/MM/DD`
- **Postings**: Indented account names with amounts
- **Currency**: Supports ₹ (INR) and other currencies

Example:
```
alias A=Assets
alias E=Expenses

2025/01/15 Payday
    Assets:Banking    ₹50000.00
    Income:Salary

2025/01/16 Groceries
    Expenses:Food    ₹500.00
    Assets:Banking
```

## Development

### Database Migrations

Create a new migration:
```bash
cd backend
alembic revision --autogenerate -m "Description"
```

Apply migrations:
```bash
alembic upgrade head
```

### Building for Production

#### Frontend
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

#### Backend
The backend is ready for production. For better performance, use a production ASGI server:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Troubleshooting

### Database Issues
- Ensure the `data/` directory exists and is writable
- Check database path in `.env` file
- Run `alembic upgrade head` to apply migrations

### Import Issues
- Verify ledger file path is correct
- Check file permissions
- Review parser logs for format issues

### Frontend Connection Issues
- Ensure backend is running on correct port
- Check CORS settings in `backend/app/config.py`
- Verify `VITE_API_BASE_URL` in frontend `.env`

## License

This project is for personal use.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

