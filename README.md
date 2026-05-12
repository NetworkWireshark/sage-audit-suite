# Sage Audit Suite

Desktop and web application for comparing Sage 100 exports with invoices, delivery notes, and accounting files.

## What is included

- FastAPI backend with SQLite persistence, JWT authentication, upload handling, comparison runs, dashboards, Excel exports, and PDF exports.
- React + Vite + TailwindCSS frontend with login, drag-and-drop uploads, KPI dashboard, filters, search, and error tables.
- Electron desktop shell that loads the Vite frontend in development and the production build in packaged mode.
- OCR-ready PDF ingestion using `pdf2image` + `pytesseract`.
- Extension seams for Sage 100 connectors, SQL Server repositories, Konica scan folders, and multi-company data partitioning.

## Structure

```text
backend/
  app/
    api/
    core/
    db/
    models/
    schemas/
    services/
frontend/
electron/
reports/
uploads/
```

## Quick start

1. Create and activate a Python virtual environment.
2. Install backend dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and adjust secrets, OCR paths, and API URLs as needed.
4. Start the API:

   ```powershell
   uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. Install frontend dependencies:

   ```powershell
   npm --prefix frontend install
   npm install
   ```

6. Start the web app:

   ```powershell
   npm run dev:web
   ```

7. Start the Electron desktop shell in development:

   ```powershell
   npm run desktop:dev
   ```

## Default users

- Admin: `admin@sage.local` / `Admin123!`
- User: `user@sage.local` / `User123!`

Change these values in `.env` before real deployment.

## Upload expectations

The comparison engine accepts CSV, XLSX, and PDF files. Tabular inputs are mapped automatically from common French and English column labels such as:

- Article code: `code`, `article`, `reference`, `sku`
- Description: `description`, `designation`, `libelle`
- Quantity: `qty`, `quantity`, `quantite`
- Unit price: `unit_price`, `price`, `prix_unitaire`
- Total: `total`, `amount`, `montant`

PDF files are OCR-processed into loose text rows when direct extraction is unavailable. In production, scanned document templates should be normalized upstream or through dedicated layout-specific parsers for stronger accuracy.

## API summary

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/upload`
- `POST /api/compare/{upload_batch_id}`
- `GET /api/dashboard/{comparison_id}`
- `GET /api/export/excel/{comparison_id}`
- `GET /api/export/pdf/{comparison_id}`

## Comparison rules

The engine:

- normalizes accents, case, dashes, repeated spaces, and punctuation;
- attempts exact code matches first;
- falls back to fuzzy description matches;
- flags missing articles, duplicate lines, quantity differences, price differences, and incorrect totals;
- calculates Sage total, invoice total, and the difference amount.

## Integration-ready seams

- `backend/app/services/comparison.py`: matching strategy and tolerance rules.
- `backend/app/services/file_parser.py`: document ingestion and OCR.
- `backend/app/models/entities.py`: persistence model ready for multi-company fields.
- Repository/service boundaries can be switched to SQL Server-backed implementations without changing the frontend contract.
- Konica scan-folder polling can be added as a background worker that writes to the existing upload/comparison flow.

