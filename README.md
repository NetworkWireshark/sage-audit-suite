# Sage Audit Suite

Desktop and web application for comparing Sage 100 exports with invoices, delivery notes, and accounting files.

## What is included

- FastAPI backend with SQLite persistence, JWT authentication, upload handling, comparison runs, dashboards, Excel exports, and PDF exports.
- React + Vite + TailwindCSS frontend with login, drag-and-drop uploads, KPI dashboard, filters, search, error tables, and a complete audit trail.
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
   python -m pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and adjust secrets, OCR paths, and API URLs as needed.

4. Start the API:

   ```powershell
   python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. Install frontend dependencies:

   ```powershell
   npm --prefix frontend install
   npm install
   ```

6. Start the web frontend in another terminal:

   ```powershell
   npm run dev:web
   ```

7. Open the web app:

   ```text
   http://127.0.0.1:5173
   ```

8. Start the Electron desktop shell in development when needed:

   ```powershell
   npm run desktop:dev
   ```

Default login:

```text
admin@sage.local
Admin123!
```

## VS Code tasks

Use `Terminal` -> `Run Task` or `Ctrl+Shift+P` -> `Tasks: Run Task`.

- `Build`: production frontend build. This is the default `Ctrl+Shift+B` task.
- `Run web app`: starts the FastAPI backend and Vite frontend.
- `Run desktop app`: starts the backend, frontend, and Electron shell.
- `Install backend deps`: installs Python dependencies from `requirements.txt`.
- `Install frontend deps`: installs frontend dependencies.
- `Clean`: removes local dependency folders.

If VS Code keeps an old task definition in memory, run `Developer: Reload Window`.

## Run in GitHub Codespaces

1. Open the repository:

   ```text
   https://github.com/NetworkWireshark/sage-audit-suite
   ```

2. Click `Code` -> `Codespaces` -> `Create codespace on main`.
3. Wait for the container setup to finish. It installs Python, backend packages, and frontend packages automatically.
4. In the Codespaces terminal, start the backend:

   ```bash
   python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Open a second terminal and start the frontend:

   ```bash
   npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173
   ```

6. Open the forwarded `5173` port from the `Ports` tab. The web app will load in the browser.

Default login:

```text
admin@sage.local
Admin123!
```

You can also run both services from VS Code with `Terminal` -> `Run Task` -> `Run web app`.

## Build

Build the web frontend:

```powershell
npm run build:web
```

Preview the production frontend:

```powershell
npm run preview:web
```

## Default users

- Admin: `admin@sage.local` / `Admin123!`
- User: `user@sage.local` / `User123!`

Change these values in `.env` before real deployment.

## Upload expectations

The comparison engine accepts CSV, XLS, XLSX, and PDF files up to 25 MB per upload. Tabular inputs are mapped automatically from common French and English column labels such as:

- Article code: `code`, `article`, `reference`, `sku`
- Description: `description`, `designation`, `libelle`
- Quantity: `qty`, `quantity`, `quantite`
- Unit price: `unit_price`, `price`, `prix_unitaire`
- Total: `total`, `amount`, `montant`

PDF files are OCR-processed into loose text rows when direct extraction is unavailable. In production, scanned document templates should be normalized upstream or through dedicated layout-specific parsers for stronger accuracy.

Uploads with unsupported extensions, empty tables, or no usable line items are rejected with a clear API error.

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
- falls back to fuzzy description matches when a code match is unavailable;
- keeps matches one-to-one so duplicate article codes cannot reuse the same document line;
- flags missing articles, duplicate lines, quantity differences, price differences, and incorrect totals;
- calculates Sage total, invoice total, and the difference amount;
- stores complete audit lines for matched, different, missing, and extra document rows.

## Reporting

The dashboard shows:

- KPI totals for matched rows, issues, missing products, audit lines, differences, and extra document lines.
- Detected issues with severity and text filters.
- A complete audit trail with status filters for all matched, different, missing, and extra lines.
- Excel and PDF exports for completed comparisons.

## Integration-ready seams

- `backend/app/services/comparison.py`: matching strategy and tolerance rules.
- `backend/app/services/file_parser.py`: document ingestion and OCR.
- `backend/app/models/entities.py`: persistence model ready for multi-company fields.
- Repository/service boundaries can be switched to SQL Server-backed implementations without changing the frontend contract.
- Konica scan-folder polling can be added as a background worker that writes to the existing upload/comparison flow.
