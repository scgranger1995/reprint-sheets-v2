"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export interface PrintLocationData {
  position: string;
  placement: string;
  inkColors: string;
  notes: string;
}

interface Props {
  location: PrintLocationData;
  index: number;
  onUpdate: (index: number, data: Partial<PrintLocationData>) => void;
  onRemove: (index: number) => void;
}

const PLACEMENT_PRESETS: Record<string, string[]> = {
  FRONT: ["Full Front", "Left Chest", "Center Chest", "Right Chest", "Pocket"],
  BACK: ["Full Back", "Upper Back", "Center Back", "Lower Back", "Nape / Yoke"],
  REAR: ["Full Back", "Upper Back", "Center Back", "Lower Back", "Nape / Yoke"],
  SPECIAL: ["Left Sleeve", "Right Sleeve", "Inside Collar", "Hem Tag"],
};

const POSITION_COLORS: Record<string, string> = {
  FRONT: "#3b82f6",
  BACK: "#22c55e",
  SPECIAL: "#a855f7",
};

export default function PrintLocationCard({
  location,
  index,
  onUpdate,
  onRemove,
}: Props) {
  const presets = PLACEMENT_PRESETS[location.position] ?? [];
  const badgeColor = POSITION_COLORS[location.position] ?? "#6b7280";

  // ---- Local state for text fields (save on blur, not on every keystroke) ----
  const [localPlacement, setLocalPlacement] = useState(location.placement);
  const [localInkColors, setLocalInkColors] = useState(location.inkColors);
  const [localNotes, setLocalNotes] = useState(location.notes);

  // Refs to track which fields are currently focused — avoid overwriting user input
  const focusedRef = useRef<Set<string>>(new Set());

  // Sync local state from prop when it changes externally (e.g., server response),
  // but only for fields the user is NOT currently editing.
  useEffect(() => {
    if (!focusedRef.current.has("placement")) setLocalPlacement(location.placement);
  }, [location.placement]);
  useEffect(() => {
    if (!focusedRef.current.has("inkColors")) setLocalInkColors(location.inkColors);
  }, [location.inkColors]);
  useEffect(() => {
    if (!focusedRef.current.has("notes")) setLocalNotes(location.notes);
  }, [location.notes]);

  // Track whether the user chose "Custom..." from the dropdown
  const isCustomPlacement =
    localPlacement !== "" && !presets.includes(localPlacement);
  const [showCustomInput, setShowCustomInput] = useState(isCustomPlacement);

  function handlePlacementChange(value: string) {
    if (value === "__custom__") {
      setShowCustomInput(true);
      setLocalPlacement("");
      onUpdate(index, { placement: "" });
    } else {
      setShowCustomInput(false);
      setLocalPlacement(value);
      // Discrete selection — save immediately
      onUpdate(index, { placement: value });
    }
  }

  const inputClasses =
    "w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-xl py-3 px-4 text-[18px] leading-tight focus:outline-none focus:border-[#CC0000] transition-colors placeholder:text-[#555]";
  const selectClasses =
    "w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-xl py-3 px-4 text-[18px] leading-tight focus:outline-none focus:border-[#CC0000] transition-colors appearance-none";

  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-4 space-y-3">
      {/* Header row: badge + delete */}
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-lg"
          style={{ backgroundColor: badgeColor + "22", color: badgeColor }}
        >
          {location.position}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-[#666] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          aria-label={`Remove ${location.position} location`}
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Row 1: Placement */}
      <div>
          {showCustomInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={localPlacement}
                onChange={(e) => setLocalPlacement(e.target.value)}
                onFocus={() => focusedRef.current.add("placement")}
                onBlur={(e) => {
                  focusedRef.current.delete("placement");
                  onUpdate(index, { placement: e.target.value });
                }}
                placeholder="Custom placement..."
                className={inputClasses}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  setLocalPlacement("");
                  onUpdate(index, { placement: "" });
                }}
                className="shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-[#666] hover:text-white hover:bg-[#222] transition-colors text-sm"
                aria-label="Back to presets"
              >
                ←
              </button>
            </div>
          ) : (
            <div className="relative">
              <select
                value={
                  presets.includes(localPlacement)
                    ? localPlacement
                    : ""
                }
                onChange={(e) => handlePlacementChange(e.target.value)}
                className={selectClasses}
              >
                <option value="" disabled>
                  Placement...
                </option>
                {presets.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
              {/* Dropdown chevron */}
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#555]">
                <svg
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1.5L6 6.5L11 1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          )}
      </div>

      {/* Row 2: Ink Colors (full width) */}
      <div>
        <input
          type="text"
          value={localInkColors}
          onChange={(e) => setLocalInkColors(e.target.value)}
          onFocus={() => focusedRef.current.add("inkColors")}
          onBlur={(e) => {
            focusedRef.current.delete("inkColors");
            onUpdate(index, { inkColors: e.target.value });
          }}
          placeholder="Ink colors..."
          className={inputClasses}
        />
      </div>

      {/* Row 3: Notes (full width) */}
      <div>
        <input
          type="text"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onFocus={() => focusedRef.current.add("notes")}
          onBlur={(e) => {
            focusedRef.current.delete("notes");
            onUpdate(index, { notes: e.target.value });
          }}
          placeholder="Notes..."
          className={inputClasses}
        />
      </div>
    </div>
  );
}
