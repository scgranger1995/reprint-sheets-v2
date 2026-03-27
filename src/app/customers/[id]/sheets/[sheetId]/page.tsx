"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Share2,
  X,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import PressCarousel, { type SideKey } from "@/components/PressCarousel";
import PrintLocationCard from "@/components/PrintLocationCard";
import PhotoGallery from "@/components/PhotoGallery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrintLocation {
  position: string;
  placement: string;
  inkColors: string;
  notes: string;
}

interface Photo {
  id: string;
  filename: string;
  originalName: string;
  caption: string;
}

interface CarouselStation {
  station: number;
  screen: string;
  color?: string;
}

interface CarouselData {
  front: CarouselStation[];
  back: CarouselStation[];
  leftSleeve?: CarouselStation[];
  rightSleeve?: CarouselStation[];
}

interface Sheet {
  id: string;
  customerId: string;
  jobName: string;
  jobDate: string;
  garmentType: string;
  garmentColor: string;
  pieceCount: number;
  frontTime: string;
  backTime: string;
  dryerTemp: string;
  dryerSpeed: string;
  notes: string;
  carousel: string;
  locations: PrintLocation[];
  photos: Photo[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface HistoryEntry {
  id: string;
  action: string;
  changes: string;
  userName: string | null;
  createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  jobName: "Job Name",
  jobDate: "Date",
  garmentType: "Garment Type",
  garmentColor: "Color",
  pieceCount: "Piece Count",
  dryerTemp: "Dryer Temp",
  dryerSpeed: "Dryer Time",
  notes: "Notes",
  carousel: "Press Carousel",
  locations: "Print Locations",
  source: "Duplicated From",
};

const ACTION_STYLES: Record<string, { color: string; label: string }> = {
  created: { color: "#22c55e", label: "Created" },
  updated: { color: "#3b82f6", label: "Updated" },
  duplicated: { color: "#a855f7", label: "Duplicated" },
  photo_added: { color: "#f59e0b", label: "Photo Added" },
  photo_deleted: { color: "#ef4444", label: "Photo Removed" },
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const INPUT =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-[18px] focus:border-[#CC0000] focus:outline-none";
const LABEL = "text-sm text-gray-400 mb-1 block font-medium";

const GARMENT_PRESETS = [
  "Gildan 5000",
  "Gildan 18000",
  "Gildan 18500",
  "Bella+Canvas 3001",
  "Bella+Canvas 3413",
  "Comfort Colors 1717",
  "Next Level 3600",
  "Hanes Beefy-T",
  "Jerzees 29M",
  "Port & Company PC61",
];

const COLOR_PRESETS = [
  "Black",
  "White",
  "Navy",
  "Royal Blue",
  "Red",
  "Sport Grey",
  "Dark Heather",
  "Charcoal",
  "Forest Green",
  "Maroon",
  "Orange",
  "Gold",
  "Purple",
  "Sand",
  "Light Blue",
  "Ash",
  "Safety Green",
  "Pink",
];

// ---------------------------------------------------------------------------
// TagInput — type or pick from presets, supports multiple values
// ---------------------------------------------------------------------------

function TagInput({
  value,
  presets,
  placeholder,
  onCommit,
}: {
  value: string;
  presets: string[];
  placeholder: string;
  onCommit: (newValue: string) => void;
}) {
  // Parse comma-separated string into tags
  const tags = value
    ? value.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter presets: exclude already-added tags, match typed text
  const filtered = presets.filter(
    (p) =>
      !tags.some((t) => t.toLowerCase() === p.toLowerCase()) &&
      p.toLowerCase().includes(input.toLowerCase()),
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...tags, trimmed].join(", ");
    onCommit(next);
    setInput("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeTag(index: number) {
    const next = tags.filter((_, i) => i !== index).join(", ");
    onCommit(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 min-h-[52px] focus-within:border-[#CC0000] transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-[#2a2a2a] text-white text-sm font-medium pl-3 pr-1.5 py-1 rounded-lg"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="flex items-center justify-center rounded-full hover:bg-[#444] transition-colors"
              style={{ width: 22, height: 22 }}
            >
              <X size={12} className="text-gray-400" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-[100px] bg-transparent text-white text-[18px] outline-none placeholder:text-[#555]"
          style={{ fontSize: 18 }}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg max-h-[240px] overflow-y-auto">
          {filtered.map((preset) => (
            <button
              key={preset}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(preset)}
              className="w-full text-left px-4 py-3 text-white text-[16px] hover:bg-[#2a2a2a] active:bg-[#333] transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SheetEditorPage({
  params,
}: {
  params: Promise<{ id: string; sheetId: string }>;
}) {
  const { id: customerId, sheetId } = use(params);
  const router = useRouter();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deletingSheet, setDeletingSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyFetchedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last server-confirmed state so we can detect real changes
  const serverSheetRef = useRef<Sheet | null>(null);

  // ---- Fetch history (lazy — on first expand) ----
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/sheets/${sheetId}/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      setHistory(await res.json());
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [sheetId]);

  // Fetch history when section is expanded for the first time
  useEffect(() => {
    if (historyOpen && !historyFetchedRef.current) {
      historyFetchedRef.current = true;
      fetchHistory();
    }
  }, [historyOpen, fetchHistory]);

  // ---- Fetch sheet ----
  const fetchSheet = useCallback(async () => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}`);
      if (!res.ok) throw new Error("Failed to fetch sheet");
      const data = await res.json();
      setSheet(data);
      serverSheetRef.current = data;
    } catch (err) {
      console.error("Error fetching sheet:", err);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  // ---- Save sheet (auto-save on blur) ----
  const saveSheet = useCallback(
    async (updates: Partial<Sheet>) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/sheets/${sheetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("Failed to save");
        const updated = await res.json();
        serverSheetRef.current = updated;
        // Only overwrite local state for relation saves (locations/photos need server IDs)
        if (updates.locations !== undefined) {
          setSheet((prev) => (prev ? { ...prev, locations: updated.locations } : prev));
        }
        setSaveStatus("saved");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Error saving sheet:", err);
        setSaveStatus("error");
      }
    },
    [sheetId],
  );

  // ---- Field blur handler ----
  const handleFieldBlur = useCallback(
    (field: keyof Sheet, value: string | number) => {
      if (!serverSheetRef.current) return;
      // Compare against the last server-confirmed value, not local state
      if (serverSheetRef.current[field] === value) return;
      saveSheet({ [field]: value });
    },
    [saveSheet],
  );

  // ---- Local field state ----
  const updateLocal = useCallback(
    (field: keyof Sheet, value: string | number) => {
      setSheet((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  // ---- Locations ----
  const saveLocations = useCallback(
    (locations: PrintLocation[]) => {
      setSheet((prev) => (prev ? { ...prev, locations } : prev));
      saveSheet({ locations });
    },
    [saveSheet],
  );

  const addLocation = useCallback(
    (position: string) => {
      if (!sheet) return;
      const newLoc: PrintLocation = {
        position,
        placement: "",
        inkColors: "",
        notes: "",
      };
      const updated = [...sheet.locations, newLoc];
      saveLocations(updated);
    },
    [sheet, saveLocations],
  );

  const updateLocation = useCallback(
    (index: number, partial: Partial<PrintLocation>) => {
      if (!sheet) return;
      const updated = [...sheet.locations];
      updated[index] = { ...updated[index], ...partial };
      saveLocations(updated);
    },
    [sheet, saveLocations],
  );

  const removeLocation = useCallback(
    (index: number) => {
      if (!sheet) return;
      const updated = sheet.locations.filter((_, i) => i !== index);
      saveLocations(updated);
    },
    [sheet, saveLocations],
  );

  // ---- Carousel ----
  const handleCarouselChange = useCallback(
    (data: CarouselData) => {
      const json = JSON.stringify(data);
      setSheet((prev) => (prev ? { ...prev, carousel: json } : prev));
      saveSheet({ carousel: json });
    },
    [saveSheet],
  );

  // ---- Duplicate ----
  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      const dup = await res.json();
      router.push(`/customers/${customerId}/sheets/${dup.id}`);
    } catch (err) {
      console.error("Error duplicating:", err);
    }
  };

  // ---- Share ----
  const handleShare = async () => {
    const url = `http://192.168.1.120:3001/customers/${customerId}/sheets/${sheetId}`;
    try {
      // navigator.clipboard requires HTTPS; fall back for plain HTTP on LAN
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
    }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push(`/customers/${customerId}`);
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  // ---- Parse carousel JSON ----
  const DEFAULT_FLASH: CarouselStation[] = [
    { station: 2, screen: "Flash" },
    { station: 8, screen: "Flash" },
    { station: 13, screen: "Flash" },
    { station: 16, screen: "Flash" },
  ];

  /** Merge default Flash stations into a side — only fills stations that have no assignment. */
  function applyDefaults(stations: CarouselStation[]): CarouselStation[] {
    const assigned = new Set(stations.map((s) => s.station));
    const merged = [...stations];
    for (const d of DEFAULT_FLASH) {
      if (!assigned.has(d.station)) merged.push(d);
    }
    merged.sort((a, b) => a.station - b.station);
    return merged;
  }

  const carouselStations: CarouselData = sheet
    ? (() => {
        try {
          const parsed = JSON.parse(sheet.carousel);
          let data: CarouselData;
          // Backwards compatibility: old format was a plain array
          if (Array.isArray(parsed)) {
            data = { front: parsed, back: [] };
          } else {
            data = parsed as CarouselData;
          }
          return {
            front: applyDefaults(data.front),
            back: applyDefaults(data.back),
            leftSleeve: data.leftSleeve ?? [],
            rightSleeve: data.rightSleeve ?? [],
          };
        } catch {
          return {
            front: applyDefaults([]),
            back: applyDefaults([]),
            leftSleeve: [],
            rightSleeve: [],
          };
        }
      })()
    : { front: applyDefaults([]), back: applyDefaults([]), leftSleeve: [], rightSleeve: [] };

  // ---- Group locations by position ----
  const frontLocations = sheet
    ? sheet.locations
        .map((loc, i) => ({ loc, index: i }))
        .filter((e) => e.loc.position === "FRONT")
    : [];
  const rearLocations = sheet
    ? sheet.locations
        .map((loc, i) => ({ loc, index: i }))
        .filter((e) => e.loc.position === "REAR")
    : [];
  const specialLocations = sheet
    ? sheet.locations
        .map((loc, i) => ({ loc, index: i }))
        .filter(
          (e) => e.loc.position !== "FRONT" && e.loc.position !== "REAR",
        )
    : [];

  // Determine which press diagram sides to show
  const hasLeftSleeve = specialLocations.some(
    (e) => e.loc.placement === "Left Sleeve"
  );
  const hasRightSleeve = specialLocations.some(
    (e) => e.loc.placement === "Right Sleeve"
  );
  const pressAvailableSides: SideKey[] = [];
  if (frontLocations.length > 0) pressAvailableSides.push("front");
  if (rearLocations.length > 0) pressAvailableSides.push("back");
  if (hasLeftSleeve) pressAvailableSides.push("leftSleeve");
  if (hasRightSleeve) pressAvailableSides.push("rightSleeve");

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading sheet...</div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Sheet not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ---- Sticky Header ---- */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1e1e1e]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/customers/${customerId}`)}
            className="flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-[#1e1e1e] active:bg-[#2a2a2a] transition-colors shrink-0"
            style={{ width: 48, height: 48 }}
            aria-label="Back to sheets"
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className="flex-1 text-xl font-bold text-white truncate">
            {sheet.jobName || "Untitled"}
          </h1>

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            {saveStatus === "saving" && (
              <>
                <Loader2 size={16} className="text-gray-400 animate-spin" />
                <span className="text-gray-400">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check size={16} className="text-green-500" />
                <span className="text-green-500">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-500">Error</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---- Main Content ---- */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* ============================================================
            TOP SECTION: Job Header
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          {/* Row 1: Job Name | Date */}
          <div className="grid grid-cols-[1fr_180px] gap-4">
            <div>
              <label className={LABEL}>Job Name</label>
              <input
                type="text"
                value={sheet.jobName}
                onChange={(e) => updateLocal("jobName", e.target.value)}
                onBlur={(e) => handleFieldBlur("jobName", e.target.value)}
                placeholder="Job name"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Date</label>
              <input
                type="date"
                value={sheet.jobDate}
                onChange={(e) => {
                  updateLocal("jobDate", e.target.value);
                  handleFieldBlur("jobDate", e.target.value);
                }}
                className={INPUT + " [color-scheme:dark]"}
              />
            </div>
          </div>

          {/* Row 2: # of Pieces */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={LABEL}># of Pieces</label>
              <input
                type="number"
                value={sheet.pieceCount || ""}
                onChange={(e) =>
                  updateLocal(
                    "pieceCount",
                    e.target.value ? parseInt(e.target.value, 10) : 0,
                  )
                }
                onBlur={(e) =>
                  handleFieldBlur(
                    "pieceCount",
                    e.target.value ? parseInt(e.target.value, 10) : 0,
                  )
                }
                placeholder="0"
                className={INPUT}
                min={0}
              />
            </div>
          </div>
        </section>

        {/* ============================================================
            JOB DETAILS
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Job Details
          </h2>

          {/* Garment Type | Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Garment Type</label>
              <TagInput
                value={sheet.garmentType}
                presets={GARMENT_PRESETS}
                placeholder="Type or select garment..."
                onCommit={(v) => {
                  updateLocal("garmentType", v);
                  handleFieldBlur("garmentType", v);
                }}
              />
            </div>
            <div>
              <label className={LABEL}>Color</label>
              <TagInput
                value={sheet.garmentColor}
                presets={COLOR_PRESETS}
                placeholder="Type or select color..."
                onCommit={(v) => {
                  updateLocal("garmentColor", v);
                  handleFieldBlur("garmentColor", v);
                }}
              />
            </div>
          </div>

          {/* Dryer Temp | Dryer Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Dryer Temp</label>
              <input
                type="text"
                value={sheet.dryerTemp}
                onChange={(e) => updateLocal("dryerTemp", e.target.value)}
                onBlur={(e) => handleFieldBlur("dryerTemp", e.target.value)}
                placeholder="e.g. 378"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Dryer Time</label>
              <input
                type="text"
                value={sheet.dryerSpeed}
                onChange={(e) => updateLocal("dryerSpeed", e.target.value)}
                onBlur={(e) => handleFieldBlur("dryerSpeed", e.target.value)}
                placeholder="e.g. 27 Seconds"
                className={INPUT}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes</label>
            <textarea
              value={sheet.notes}
              onChange={(e) => updateLocal("notes", e.target.value)}
              onBlur={(e) => handleFieldBlur("notes", e.target.value)}
              placeholder="Additional notes..."
              rows={5}
              className={INPUT + " resize-none"}
            />
          </div>
        </section>

        {/* ============================================================
            PRINT LOCATIONS
            ============================================================ */}
        <section className="space-y-6">
          {/* Front Print Locations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                Front Print Locations
              </h2>
              <button
                onClick={() => addLocation("FRONT")}
                className="flex items-center gap-1.5 text-[#CC0000] font-medium text-sm hover:text-red-400 active:opacity-70 transition-colors"
                style={{ minHeight: 44 }}
              >
                <Plus size={18} />
                Add Front
              </button>
            </div>
            {frontLocations.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No front print locations added.
              </p>
            ) : (
              <div className="space-y-3">
                {frontLocations.map((entry) => (
                  <PrintLocationCard
                    key={entry.index}
                    location={entry.loc}
                    index={entry.index}
                    onUpdate={updateLocation}
                    onRemove={removeLocation}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Rear Print Locations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                Rear Print Locations
              </h2>
              <button
                onClick={() => addLocation("REAR")}
                className="flex items-center gap-1.5 text-[#CC0000] font-medium text-sm hover:text-red-400 active:opacity-70 transition-colors"
                style={{ minHeight: 44 }}
              >
                <Plus size={18} />
                Add Rear
              </button>
            </div>
            {rearLocations.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No rear print locations added.
              </p>
            ) : (
              <div className="space-y-3">
                {rearLocations.map((entry) => (
                  <PrintLocationCard
                    key={entry.index}
                    location={entry.loc}
                    index={entry.index}
                    onUpdate={updateLocation}
                    onRemove={removeLocation}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Special Print Locations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                Special Print Locations
              </h2>
              <button
                onClick={() => addLocation("SPECIAL")}
                className="flex items-center gap-1.5 text-[#CC0000] font-medium text-sm hover:text-red-400 active:opacity-70 transition-colors"
                style={{ minHeight: 44 }}
              >
                <Plus size={18} />
                Add Special
              </button>
            </div>
            {specialLocations.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No special print locations added.
              </p>
            ) : (
              <div className="space-y-3">
                {specialLocations.map((entry) => (
                  <PrintLocationCard
                    key={entry.index}
                    location={entry.loc}
                    index={entry.index}
                    onUpdate={updateLocation}
                    onRemove={removeLocation}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            PRESS CAROUSEL — full width
            ============================================================ */}
        {pressAvailableSides.length > 0 && (
          <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">
              Press Carousel
            </h2>
            <PressCarousel
              value={carouselStations}
              onChange={handleCarouselChange}
              availableSides={pressAvailableSides}
            />
          </section>
        )}

        {/* ============================================================
            PHOTOS
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Photos</h2>
          <PhotoGallery sheetId={sheetId} photos={sheet.photos} onPhotosChange={fetchSheet} />
        </section>

        {/* ============================================================
            EDIT HISTORY
            ============================================================ */}
        <section className="bg-[#141414] border border-[#1e1e1e] rounded-xl">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center gap-3 p-5 text-left"
          >
            <Clock size={20} className="text-[#CC0000] shrink-0" />
            <h2 className="text-lg font-semibold text-white flex-1">
              Edit History
            </h2>
            {historyOpen ? (
              <ChevronDown size={20} className="text-gray-500" />
            ) : (
              <ChevronRight size={20} className="text-gray-500" />
            )}
          </button>

          {historyOpen && (
            <div className="px-5 pb-5 -mt-2">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Loader2 size={16} className="animate-spin" />
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">
                  No edit history yet.
                </p>
              ) : (
                <div className="relative border-l-2 border-[#2a2a2a] ml-2 space-y-4 pt-2">
                  {history.map((entry) => {
                    const style = ACTION_STYLES[entry.action] ?? {
                      color: "#888",
                      label: entry.action,
                    };
                    const changes: Record<
                      string,
                      { from: unknown; to: unknown }
                    > = (() => {
                      try {
                        return JSON.parse(entry.changes);
                      } catch {
                        return {};
                      }
                    })();
                    const changeKeys = Object.keys(changes);
                    const ts = new Date(entry.createdAt);
                    const date = ts.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const time = ts.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div key={entry.id} className="relative pl-6">
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-[#141414]"
                          style={{ backgroundColor: style.color }}
                        />

                        {/* Header: action badge + timestamp */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: style.color + "22",
                              color: style.color,
                            }}
                          >
                            {style.label}
                          </span>
                          {entry.userName && (
                            <span className="text-xs text-gray-400">
                              by {entry.userName}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {date} at {time}
                          </span>
                        </div>

                        {/* Change details */}
                        {changeKeys.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {changeKeys.map((key) => {
                              const c = changes[key];
                              const label =
                                FIELD_LABELS[key] ?? key;
                              const fromStr = String(c.from ?? "");
                              const toStr = String(c.to ?? "");

                              return (
                                <div
                                  key={key}
                                  className="text-sm text-gray-400"
                                >
                                  <span className="text-gray-300 font-medium">
                                    {label}
                                  </span>
                                  {fromStr && toStr ? (
                                    <>
                                      {" "}
                                      <span className="text-red-400/70 line-through">
                                        {fromStr.length > 60
                                          ? fromStr.slice(0, 57) + "…"
                                          : fromStr}
                                      </span>{" "}
                                      →{" "}
                                      <span className="text-green-400/80">
                                        {toStr.length > 60
                                          ? toStr.slice(0, 57) + "…"
                                          : toStr}
                                      </span>
                                    </>
                                  ) : toStr ? (
                                    <>
                                      {" "}
                                      set to{" "}
                                      <span className="text-green-400/80">
                                        {toStr.length > 60
                                          ? toStr.slice(0, 57) + "…"
                                          : toStr}
                                      </span>
                                    </>
                                  ) : fromStr ? (
                                    <>
                                      {" "}
                                      <span className="text-red-400/70 line-through">
                                        {fromStr.length > 60
                                          ? fromStr.slice(0, 57) + "…"
                                          : fromStr}
                                      </span>{" "}
                                      cleared
                                    </>
                                  ) : (
                                    <> changed</>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Refresh button — always visible */}
              {!historyLoading && (
                <button
                  type="button"
                  onClick={fetchHistory}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Refresh history
                </button>
              )}
            </div>
          )}
        </section>

        {/* ============================================================
            FOOTER ACTIONS
            ============================================================ */}
        <section className="flex items-center gap-4 pb-8">
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 bg-[#1e1e1e] text-gray-300 font-semibold px-5 py-3 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
            style={{ minHeight: 48 }}
          >
            <Copy size={18} />
            Duplicate
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-[#1e1e1e] text-gray-300 font-semibold px-5 py-3 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
            style={{ minHeight: 48 }}
          >
            <Share2 size={18} />
            {copied ? "Copied!" : "Share"}
          </button>

          {deletingSheet ? (
            <div className="flex items-center gap-3 bg-[#1a0000] border border-red-900 rounded-xl px-5 py-3">
              <span className="text-red-400 text-sm font-medium">
                Delete this sheet?
              </span>
              <button
                onClick={handleDelete}
                className="bg-[#CC0000] text-white font-semibold px-4 py-2 rounded-lg active:opacity-80 transition-opacity"
                style={{ minHeight: 40 }}
              >
                Confirm
              </button>
              <button
                onClick={() => setDeletingSheet(false)}
                className="bg-[#2a2a2a] text-gray-300 px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
                style={{ minHeight: 40 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeletingSheet(true)}
              className="flex items-center gap-2 bg-[#1e1e1e] text-red-400 font-semibold px-5 py-3 rounded-xl hover:bg-[#2a0000] active:bg-[#3a0000] transition-colors"
              style={{ minHeight: 48 }}
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
