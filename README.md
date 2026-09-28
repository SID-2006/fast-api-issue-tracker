# FastAPI Issue Tracker

A small issue tracker with a FastAPI API, JWT authentication, and a React frontend.
Created for learning purposes.

## Requirements

- Python 3.10 or later
- Node.js 20 or later

## Setup

Create and activate a virtual environment, then install the Python dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Install the frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

For local development, the app uses a development-only JWT signing key by default. Before deployment, set `SECRET_KEY` to a long, random value. One way to generate a value is:

```powershell
py -c "import secrets; print(secrets.token_hex(32))"
```

Set it in the current PowerShell session with `$env:SECRET_KEY = "<generated-value>"` before starting the API. `.env.example` shows the expected variable name; do not commit a real `.env` file.

## Run

Start the API from the project root:

```powershell
uvicorn main:app --reload
```

In a second terminal, start the React development server:

```powershell
cd frontend
npm run dev
```

Open the URL printed by Vite. You can create an account from the sign-in screen, or use the demo account `johndoe` with password `secret`.

The API documentation is available at `http://localhost:8000/docs`.

## Production Build

Build the React frontend:

```powershell
cd frontend
npm run build
```

When `frontend/dist` exists, FastAPI serves the built frontend at `/` alongside the API.

## Local Data

Issues and registered user password hashes are stored in JSON files under `data/`. Those files are ignored by Git and are not included in the repository.
