"use client";

import { AlertTriangle, CheckCircle2, FileArchive, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, phpApi, type HyipImport } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HyipImport() {
  const [file, setFile] = useState<File | null>(null);
  const [imports, setImports] = useState<HyipImport[]>([]);
  const [result, setResult] = useState<HyipImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    phpApi.hyipImports().then((result) => {
      if (active) setImports(result.imports);
    }).catch(() => {
      if (active) setError("Previous HYIP imports could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a ZIP archive first.");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const response = await phpApi.importHyipArchive(file);
      setResult(response.import);
      setImports((current) => [response.import, ...current.filter((item) => item.id !== response.import.id)].slice(0, 20));
      setFile(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The HYIP archive could not be staged.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">HYIP import</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Upload a HYIP archive for isolated staging and compatibility checks. Nothing in the archive is executed or connected to the live site.</p>
      </header>

      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 text-sm leading-6 text-muted-foreground">
        <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-primary" /><p><strong className="text-foreground">Staging only.</strong> The importer never runs <code>install.php</code>, never exposes the extracted files publicly, and never enables financial actions. Activation requires a separate review and a compatible ionCube Loader.</p></div>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Upload size={18} /></span><div><h2 className="text-lg font-extrabold">Upload archive</h2><p className="text-xs text-muted-foreground">ZIP only · 32 MB maximum</p></div></div>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-5 py-9 text-center transition hover:border-primary/50 hover:bg-primary/[0.03]">
              <FileArchive size={28} className="text-primary" />
              <span className="text-sm font-bold">{file ? file.name : "Choose a HYIP ZIP archive"}</span>
              <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : "The archive remains in protected staging storage."}</span>
              <input type="file" accept=".zip,application/zip" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            <button type="submit" disabled={uploading || !file} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60">{uploading ? <><Loader2 size={16} className="animate-spin" /> Staging archive…</> : <><Upload size={16} /> Stage archive</>}</button>
          </form>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Preflight result</h2>
          {result ? <Preflight result={result} /> : <p className="mt-5 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">Upload an archive to see its compatibility report.</p>}
        </section>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3"><FileArchive size={19} className="text-primary" /><div><h2 className="text-lg font-extrabold">Previous imports</h2><p className="text-xs text-muted-foreground">Only the 20 most recent staged archives are listed.</p></div></div>
        <div className="mt-5 flex flex-col gap-2">{loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading imports…</p> : imports.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No HYIP archives have been staged.</p> : imports.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.originalName}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(item.stagedAt)} · {item.entryCount} files · {formatBytes(item.size)}</p></div><span className="w-fit rounded-full border border-line px-2.5 py-1 text-xs font-bold text-muted-foreground">Staged only</span></div>)}</div>
      </section>
    </div>
  );
}

function Preflight({ result }: { result: HyipImport }) {
  const { preflight } = result;
  const checks = [
    { label: "Admin entry point", ok: preflight.adminEntryFound },
    { label: "Public entry point", ok: preflight.publicEntryFound },
    { label: "ionCube encoded", ok: preflight.ionCubeEncoded, neutral: !preflight.ionCubeEncoded },
    { label: "ionCube Loader available", ok: preflight.ionCubeLoaderAvailable, neutral: !preflight.ionCubeLoaderAvailable },
    { label: "Installer present", ok: !preflight.installerFound, neutral: preflight.installerFound, warning: preflight.installerFound },
  ];
  return <div className="mt-5 flex flex-col gap-4"><div className="flex flex-col gap-2">{checks.map((check) => <div key={check.label} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"><span className="flex items-center gap-2">{check.warning ? <AlertTriangle size={16} className="text-amber-500" /> : check.ok ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className="text-danger" />}{check.label}</span><span className={`text-xs font-bold ${check.ok ? "text-success" : check.neutral ? "text-muted-foreground" : "text-danger"}`}>{check.ok ? "Passed" : check.neutral ? "Not detected" : "Needs review"}</span></div>)}</div>{preflight.financialFeatureMarkers.length > 0 ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300"><p className="font-bold">Financial feature files detected</p><p className="mt-1">{preflight.financialFeatureMarkers.slice(0, 8).join(", ")}{preflight.financialFeatureMarkers.length > 8 ? "…" : ""}</p></div> : null}{preflight.blockers.length > 0 ? <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm leading-6 text-danger"><p className="font-bold">Activation blockers</p><ul className="mt-2 list-disc pl-5">{preflight.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success">Archive staged successfully. It is not activated.</p>}<p className="text-xs text-muted-foreground">SHA-256: <code className="break-all">{result.sha256}</code></p></div>;
}
