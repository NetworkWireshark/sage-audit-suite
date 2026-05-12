import { useState } from "react";
import { FileSpreadsheet, ScanLine, UploadCloud } from "lucide-react";

export default function UploadPanel({ onSubmit, busy, status }) {
  const [sageFile, setSageFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [companyKey, setCompanyKey] = useState("default");

  function captureFile(event, setter) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] || event.target.files?.[0];
    if (file) {
      setter(file);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (!sageFile || !documentFile) {
      return;
    }
    onSubmit({ sageFile, documentFile, companyKey });
  }

  return (
    <section className="rounded border border-line bg-panel p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Upload comparison set</h2>
          <p className="text-sm text-slate-400">CSV, XLSX, and PDF documents are accepted.</p>
        </div>
        <label className="text-sm text-slate-300">
          Company key
          <input value={companyKey} onChange={(event) => setCompanyKey(event.target.value)} className="ml-3 rounded border border-line bg-ink px-3 py-2 text-white outline-none focus:border-aqua" />
        </label>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <DropZone
            title="Sage export"
            caption="CSV or XLSX"
            icon={FileSpreadsheet}
            file={sageFile}
            onDrop={(event) => captureFile(event, setSageFile)}
            onChange={(event) => captureFile(event, setSageFile)}
          />
          <DropZone
            title="Invoice or accounting document"
            caption="CSV, XLSX, or PDF"
            icon={ScanLine}
            file={documentFile}
            onDrop={(event) => captureFile(event, setDocumentFile)}
            onChange={(event) => captureFile(event, setDocumentFile)}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-400">{status}</p>
          <button type="submit" disabled={busy || !sageFile || !documentFile} className="inline-flex items-center justify-center gap-2 rounded bg-aqua px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60">
            <UploadCloud className="h-4 w-4" />
            {busy ? "Processing..." : "Upload and compare"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DropZone({ title, caption, icon: Icon, file, onDrop, onChange }) {
  return (
    <label onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="flex min-h-[180px] cursor-pointer flex-col justify-between rounded border border-dashed border-line bg-panelSoft p-4 transition hover:border-aqua">
      <input type="file" className="hidden" onChange={onChange} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{caption}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded border border-line bg-panel">
          <Icon className="h-5 w-5 text-aqua" />
        </span>
      </div>
      <p className="mt-6 truncate text-sm text-slate-300">{file ? file.name : "Drop a file here or click to browse"}</p>
    </label>
  );
}
