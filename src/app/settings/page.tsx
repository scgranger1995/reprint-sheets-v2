"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  Download,
  HardDrive,
  Image,
  Loader2,
  Users,
  FileText,
  Archive,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Terminal,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stats {
  customers: number;
  sheets: number;
  photos: number;
  photoFiles: number;
  dbSizeBytes: number;
  uploadsSizeBytes: number;
}

interface UpdateStatus {
  status: "idle" | "running" | "success" | "error";
  step: string;
  log: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"db" | "full" | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Update state ----
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      setStats(await res.json());
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDownload = async (type: "db" | "full") => {
    setDownloading(type);
    try {
      const url =
        type === "db"
          ? "/api/settings/backup/db"
          : "/api/settings/backup/full";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `backup-${type}.${type === "db" ? "db" : "zip"}`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreResult(null);
    setRestoreFile(file);
    // Reset input so re-selecting the same file triggers onChange
    e.target.value = "";
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    setRestoreResult(null);
    try {
      const formData = new FormData();
      formData.append("file", restoreFile);
      const res = await fetch("/api/settings/restore", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setRestoreResult({ success: false, message: data.error });
      } else {
        setRestoreResult({ success: true, message: data.message });
        // Refresh stats to reflect restored data
        fetchStats();
      }
    } catch (err) {
      console.error("Restore error:", err);
      setRestoreResult({
        success: false,
        message: "Restore failed. Check the server logs.",
      });
    } finally {
      setRestoring(false);
      setRestoreFile(null);
    }
  };

  // ---- Update functions ----
  const pollUpdateStatus = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/settings/update");
        const data: UpdateStatus = await res.json();
        setUpdateStatus(data);
        if (data.status !== "running") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {
        // server may be down during restart
      }
    }, 1500);
  }, []);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      const res = await fetch("/api/settings/update", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setUpdateStatus({
          status: "error",
          step: "Failed",
          log: data.error || "Failed to start update",
          startedAt: null,
          completedAt: null,
        });
        return;
      }
      setUpdateStatus({
        status: "running",
        step: "Starting...",
        log: "",
        startedAt: new Date().toISOString(),
        completedAt: null,
      });
      setShowLog(true);
      pollUpdateStatus();
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const handleRestart = async () => {
    try {
      await fetch("/api/settings/update", { method: "DELETE" });
      setUpdateStatus({
        status: "running",
        step: "Restarting server...",
        log: "",
        startedAt: null,
        completedAt: null,
      });
    } catch {
      // expected — server dies
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ---- Header ---- */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1e1e1e]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/customers")}
            className="flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-[#1e1e1e] active:bg-[#2a2a2a] transition-colors shrink-0"
            style={{ width: 48, height: 48 }}
            aria-label="Back to customers"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* ============================================================
            UPDATE
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <RefreshCw size={20} className="text-[#CC0000]" />
            Update App
          </h2>

          <p className="text-gray-400 text-sm">
            Pulls the latest code from git, installs dependencies, and rebuilds
            the app. Push your changes from your dev machine first.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Update button */}
            <button
              onClick={handleUpdate}
              disabled={updateStatus?.status === "running"}
              className="flex items-center gap-2 bg-[#CC0000] text-white font-semibold px-5 py-3 rounded-xl active:opacity-80 transition-opacity disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              {updateStatus?.status === "running" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {updateStatus?.status === "running"
                ? `Updating — ${updateStatus.step}`
                : "Pull & Build"}
            </button>

            {/* Restart button — only after a successful build */}
            {updateStatus?.status === "success" && (
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 bg-[#1e1e1e] text-white font-medium px-5 py-3 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
                style={{ minHeight: 48 }}
              >
                <RotateCcw size={18} />
                Restart Server
              </button>
            )}

            {/* Toggle log */}
            {updateStatus && updateStatus.status !== "idle" && (
              <button
                onClick={() => setShowLog((v) => !v)}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                style={{ minHeight: 48 }}
              >
                <Terminal size={16} />
                {showLog ? "Hide Log" : "Show Log"}
              </button>
            )}
          </div>

          {/* Status result */}
          {updateStatus?.status === "success" && (
            <div className="flex items-start gap-3 bg-green-950/30 border border-green-900/50 rounded-xl p-4">
              <CheckCircle2
                size={20}
                className="text-green-500 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-green-300 font-medium">
                  Update complete
                </p>
                <p className="text-green-400/70 text-sm mt-0.5">
                  Click &quot;Restart Server&quot; to apply changes, or restart
                  manually with{" "}
                  <code className="text-green-300">
                    pm2 restart reprint-sheets
                  </code>
                </p>
              </div>
            </div>
          )}

          {updateStatus?.status === "error" && (
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/50 rounded-xl p-4">
              <AlertTriangle
                size={20}
                className="text-red-500 shrink-0 mt-0.5"
              />
              <p className="text-red-300">
                Update failed at step: {updateStatus.step}
              </p>
            </div>
          )}

          {/* Log output */}
          {showLog && updateStatus?.log && (
            <pre className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 text-xs text-gray-400 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap font-mono">
              {updateStatus.log}
            </pre>
          )}
        </section>

        {/* ============================================================
            DATABASE STATS
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={20} className="text-[#CC0000]" />
            Database
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              Loading stats...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<Users size={18} />}
                label="Customers"
                value={String(stats.customers)}
              />
              <StatCard
                icon={<FileText size={18} />}
                label="Sheets"
                value={String(stats.sheets)}
              />
              <StatCard
                icon={<Image size={18} />}
                label="Photos"
                value={String(stats.photos)}
              />
              <StatCard
                icon={<HardDrive size={18} />}
                label="DB Size"
                value={formatBytes(stats.dbSizeBytes)}
              />
              <StatCard
                icon={<Archive size={18} />}
                label="Photo Storage"
                value={formatBytes(stats.uploadsSizeBytes)}
              />
              <StatCard
                icon={<HardDrive size={18} />}
                label="Total Size"
                value={formatBytes(
                  stats.dbSizeBytes + stats.uploadsSizeBytes
                )}
              />
            </div>
          ) : (
            <p className="text-gray-500">Failed to load stats.</p>
          )}
        </section>

        {/* ============================================================
            BACKUPS
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Download size={20} className="text-[#CC0000]" />
            Backups
          </h2>

          {/* Database-only backup */}
          <div className="flex items-center gap-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex-1">
              <h3 className="text-white font-medium">Database Only</h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Downloads the SQLite database file. Small and fast — includes
                all customer data, sheets, and location info but not photos.
              </p>
            </div>
            <button
              onClick={() => handleDownload("db")}
              disabled={downloading !== null}
              className="shrink-0 flex items-center gap-2 bg-[#1e1e1e] text-white font-medium px-5 py-3 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              {downloading === "db" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {downloading === "db" ? "Downloading..." : "Download"}
            </button>
          </div>

          {/* Full backup */}
          <div className="flex items-center gap-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex-1">
              <h3 className="text-white font-medium">Full Backup</h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Downloads a ZIP with the database and all uploaded photos.
                Larger file but a complete backup of everything.
              </p>
            </div>
            <button
              onClick={() => handleDownload("full")}
              disabled={downloading !== null}
              className="shrink-0 flex items-center gap-2 bg-[#1e1e1e] text-white font-medium px-5 py-3 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors disabled:opacity-50"
              style={{ minHeight: 48 }}
            >
              {downloading === "full" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Archive size={18} />
              )}
              {downloading === "full" ? "Downloading..." : "Download"}
            </button>
          </div>

          <p className="text-gray-500 text-xs mt-2">
            Tip: Schedule regular backups of the <code className="text-gray-400">prisma/dev.db</code> file
            and <code className="text-gray-400">uploads/</code> folder on the server for automatic protection.
          </p>
        </section>

        {/* ============================================================
            RESTORE
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Upload size={20} className="text-[#CC0000]" />
            Restore
          </h2>

          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
            <div>
              <h3 className="text-white font-medium">Restore from Backup</h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Upload a <code className="text-gray-300">.db</code> file or a
                full backup <code className="text-gray-300">.zip</code> to
                restore your data. Your current database is automatically backed
                up before restoring.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".db,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* No file selected yet — show the pick button */}
            {!restoreFile && !restoring && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-[#1e1e1e] text-white font-medium px-5 py-3 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
                style={{ minHeight: 48 }}
              >
                <Upload size={18} />
                Choose Backup File
              </button>
            )}

            {/* File selected — confirmation */}
            {restoreFile && !restoring && (
              <div className="bg-[#1a0a00] border border-yellow-900/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="text-yellow-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-white font-medium">
                      Restore from {restoreFile.name}?
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      This will replace all current data with the backup. A copy
                      of the current database will be saved as{" "}
                      <code className="text-gray-300">dev.db.bak</code> in case
                      you need to undo this.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-8">
                  <button
                    onClick={handleRestore}
                    className="flex items-center gap-2 bg-[#CC0000] text-white font-semibold px-5 py-2.5 rounded-lg active:opacity-80 transition-opacity"
                    style={{ minHeight: 44 }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => setRestoreFile(null)}
                    className="bg-[#2a2a2a] text-gray-300 px-5 py-2.5 rounded-lg hover:bg-[#333] active:bg-[#444] transition-colors"
                    style={{ minHeight: 44 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Restoring in progress */}
            {restoring && (
              <div className="flex items-center gap-3 text-gray-400 py-2">
                <Loader2 size={20} className="animate-spin" />
                <span>Restoring backup...</span>
              </div>
            )}
          </div>

          {/* Restore result feedback */}
          {restoreResult && (
            <div
              className={`flex items-start gap-3 rounded-xl p-4 ${
                restoreResult.success
                  ? "bg-green-950/30 border border-green-900/50"
                  : "bg-red-950/30 border border-red-900/50"
              }`}
            >
              {restoreResult.success ? (
                <CheckCircle2
                  size={20}
                  className="text-green-500 shrink-0 mt-0.5"
                />
              ) : (
                <AlertTriangle
                  size={20}
                  className="text-red-500 shrink-0 mt-0.5"
                />
              )}
              <p
                className={
                  restoreResult.success ? "text-green-300" : "text-red-300"
                }
              >
                {restoreResult.message}
              </p>
            </div>
          )}
        </section>

        {/* ============================================================
            APP INFO
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">About</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <span className="text-gray-500">App:</span>{" "}
              Reprint Sheets — Graphic Disorder
            </p>
            <p>
              <span className="text-gray-500">Database:</span> SQLite (via Prisma)
            </p>
            <p>
              <span className="text-gray-500">Storage:</span> Local file system
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  );
}
