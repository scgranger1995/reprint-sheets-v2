"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Copy,
  Pencil,
  X,
  Check,
  FileText,
  Camera,
  MapPin,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SheetSummary {
  id: string;
  customerId: string;
  jobName: string;
  jobDate: string;
  garmentType: string;
  garmentColor: string;
  pieceCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { locations: number; photos: number };
}

interface Customer {
  id: string;
  name: string;
  sheets: SheetSummary[];
}

interface SheetGroup {
  baseName: string;
  sheets: SheetSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip trailing date (MM/DD/YY) or " (Copy)" variants to get the base job name for grouping. */
function getBaseName(jobName: string): string {
  return jobName
    .replace(/\s*\(Copy(?:\s*\d*)?\)\s*$/i, "")
    .replace(/\s+\d{2}\/\d{2}\/\d{2}\s*$/, "")
    .trim() || "Untitled";
}

/** Group sheets by their base job name, preserving order (newest first). */
function groupSheets(sheets: SheetSummary[]): SheetGroup[] {
  const map = new Map<string, SheetSummary[]>();
  const order: string[] = [];

  // Sort all sheets newest first by updatedAt
  const sorted = [...sheets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const s of sorted) {
    const base = getBaseName(s.jobName);
    if (!map.has(base)) {
      map.set(base, []);
      order.push(base);
    }
    map.get(base)!.push(s);
  }

  return order.map((baseName) => ({
    baseName,
    sheets: map.get(baseName)!,
  }));
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const INPUT =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-[18px] focus:border-[#CC0000] focus:outline-none";

// ---------------------------------------------------------------------------
// Sheet Card (reused in flat + grouped views)
// ---------------------------------------------------------------------------

function SheetCard({
  s,
  customerId,
  onDuplicate,
  onDelete,
  deletingId,
  setDeletingId,
  fmtDate,
  indent,
}: {
  s: SheetSummary;
  customerId: string;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
  fmtDate: (iso: string) => string;
  indent?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative">
      {/* Delete confirmation overlay */}
      {deletingId === s.id && (
        <div className="absolute inset-0 z-20 bg-[#141414]/95 border border-red-900 rounded-xl flex items-center justify-center gap-4 p-4">
          <p className="text-white text-sm">Delete this sheet?</p>
          <button
            onClick={() => onDelete(s.id)}
            className="bg-[#CC0000] text-white font-semibold px-4 py-2 rounded-lg active:opacity-80 transition-opacity"
            style={{ minHeight: 44 }}
          >
            Delete
          </button>
          <button
            onClick={() => setDeletingId(null)}
            className="bg-[#2a2a2a] text-gray-300 px-4 py-2 rounded-lg hover:bg-[#333] active:bg-[#444] transition-colors"
            style={{ minHeight: 44 }}
          >
            Cancel
          </button>
        </div>
      )}

      <div
        onClick={() =>
          router.push(`/customers/${customerId}/sheets/${s.id}`)
        }
        className={`bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 cursor-pointer hover:border-[#2a2a2a] active:bg-[#1a1a1a] transition-colors ${indent ? "ml-6" : ""}`}
      >
        <div className="flex items-start gap-3">
          <FileText
            size={24}
            className="text-gray-500 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {s.jobName || "Untitled"}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
              {s.jobDate && (
                <span>
                  {(() => {
                    const [y, m, d] = s.jobDate.split("-");
                    return y && m && d ? `${m}/${d}/${y.slice(2)}` : s.jobDate;
                  })()}
                </span>
              )}
              {(s.garmentType || s.garmentColor) && (
                <span>
                  {s.garmentType}
                  {s.garmentType && s.garmentColor ? " - " : ""}
                  {s.garmentColor}
                </span>
              )}
              {s.pieceCount > 0 && (
                <span>{s.pieceCount} pieces</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {s._count?.locations ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Camera size={12} />
                {s._count?.photos ?? 0}
              </span>
              <span>Updated {fmtDate(s.updatedAt)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="flex gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onDuplicate(s.id)}
              className="flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
              style={{ width: 44, height: 44 }}
              aria-label="Duplicate sheet"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => setDeletingId(s.id)}
              className="flex items-center justify-center text-gray-500 hover:text-red-500 rounded-lg hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
              style={{ width: 44, height: 44 }}
              aria-label="Delete sheet"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CustomerSheetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ---- Fetch customer + sheets ----
  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch customer");
      const data: Customer = await res.json();
      setCustomer(data);
      setSheets(data.sheets);
      setNameValue(data.name);
    } catch (err) {
      console.error("Error fetching customer:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // ---- Debounced search (300ms) ----
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // ---- Filter sheets client-side ----
  const filtered = sheets.filter((s) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      s.jobName.toLowerCase().includes(q) ||
      s.garmentType.toLowerCase().includes(q)
    );
  });

  // ---- Group filtered sheets ----
  const groups = groupSheets(filtered);

  // ---- Toggle group collapse ----
  const toggleGroup = (baseName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(baseName)) next.delete(baseName);
      else next.add(baseName);
      return next;
    });
  };

  // ---- Rename customer ----
  const startEditName = () => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const commitRename = async () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (!trimmed || !customer || trimmed === customer.name) return;
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setCustomer((prev) => (prev ? { ...prev, name: trimmed } : prev));
    } catch (err) {
      console.error("Error renaming:", err);
      setNameValue(customer.name);
    }
  };

  // ---- Create sheet ----
  const handleCreateSheet = async () => {
    try {
      const res = await fetch(`/api/customers/${id}/sheets`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create sheet");
      const sheet: SheetSummary = await res.json();
      router.push(`/customers/${id}/sheets/${sheet.id}`);
    } catch (err) {
      console.error("Error creating sheet:", err);
    }
  };

  // ---- Delete sheet ----
  const handleDeleteSheet = async (sheetId: string) => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete sheet");
      setSheets((prev) => prev.filter((s) => s.id !== sheetId));
    } catch (err) {
      console.error("Error deleting sheet:", err);
    }
    setDeletingId(null);
  };

  // ---- Duplicate sheet ----
  const handleDuplicate = async (sheetId: string) => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate sheet");
      const dup: SheetSummary = await res.json();
      setSheets((prev) => [dup, ...prev]);
    } catch (err) {
      console.error("Error duplicating sheet:", err);
    }
  };

  // ---- Format helpers ----
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Customer not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-6 max-w-4xl mx-auto">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/customers")}
          className="flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-[#1e1e1e] active:bg-[#2a2a2a] transition-colors shrink-0"
          style={{ width: 48, height: 48 }}
          aria-label="Back to customers"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameValue(customer.name);
                  }
                }}
                onBlur={commitRename}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-2xl font-bold focus:border-[#CC0000] focus:outline-none w-full"
                style={{ fontSize: 24 }}
              />
              <button
                onClick={commitRename}
                className="flex items-center justify-center text-[#CC0000] shrink-0"
                style={{ width: 44, height: 44 }}
                aria-label="Save name"
              >
                <Check size={22} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white truncate">
                {customer.name}
              </h1>
              <button
                onClick={startEditName}
                className="flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-[#1e1e1e] active:bg-[#2a2a2a] transition-colors shrink-0"
                style={{ width: 40, height: 40 }}
                aria-label="Edit customer name"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleCreateSheet}
          className="flex items-center gap-2 bg-[#CC0000] text-white font-semibold px-5 py-3 rounded-xl text-base active:opacity-80 transition-opacity shrink-0"
          style={{ minHeight: 48 }}
        >
          <Plus size={20} />
          New Sheet
        </button>
      </div>

      {/* ---- Search ---- */}
      <div className="relative mb-6">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sheets..."
          className={INPUT + " pl-12"}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ---- Sheet list (grouped) ---- */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 mt-16">
          {sheets.length === 0
            ? 'No sheets yet. Tap "New Sheet" to create one.'
            : "No sheets match your search."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            // Single sheet — render flat (no folder wrapper)
            if (group.sheets.length === 1) {
              const s = group.sheets[0];
              return (
                <SheetCard
                  key={s.id}
                  s={s}
                  customerId={id}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteSheet}
                  deletingId={deletingId}
                  setDeletingId={setDeletingId}
                  fmtDate={fmtDate}
                />
              );
            }

            // Multiple sheets — render as collapsible folder
            const isCollapsed = collapsedGroups.has(group.baseName);

            return (
              <div key={group.baseName} className="flex flex-col gap-2">
                {/* Folder header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.baseName)}
                  className="flex items-center gap-3 bg-[#181818] border border-[#1e1e1e] rounded-xl px-4 py-3 hover:border-[#2a2a2a] active:bg-[#1a1a1a] transition-colors text-left"
                  style={{ minHeight: 48 }}
                >
                  {isCollapsed ? (
                    <ChevronRight size={20} className="text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500 shrink-0" />
                  )}
                  <FolderOpen size={20} className="text-[#CC0000] shrink-0" />
                  <span className="flex-1 text-white font-semibold truncate">
                    {group.baseName}
                  </span>
                  <span className="text-sm text-gray-500 shrink-0">
                    {group.sheets.length} sheets
                  </span>
                </button>

                {/* Folder contents */}
                {!isCollapsed && (
                  <div className="flex flex-col gap-2">
                    {group.sheets.map((s) => (
                      <SheetCard
                        key={s.id}
                        s={s}
                        customerId={id}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDeleteSheet}
                        deletingId={deletingId}
                        setDeletingId={setDeletingId}
                        fmtDate={fmtDate}
                        indent
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
