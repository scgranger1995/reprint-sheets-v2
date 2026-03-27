"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Station {
  station: number;
  screen: string;
  color?: string;
}

export type SideKey = "front" | "back" | "leftSleeve" | "rightSleeve";

const SIDE_LABELS: Record<SideKey, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "L Sleeve",
  rightSleeve: "R Sleeve",
};

export interface CarouselData {
  front: Station[];
  back: Station[];
  leftSleeve?: Station[];
  rightSleeve?: Station[];
}

interface PressCarouselProps {
  value: CarouselData;
  onChange: (data: CarouselData) => void;
  availableSides?: SideKey[];
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  underbase: "#6366f1",
  white: "#e5e7eb",
  flash: "#ff6b2b",
  red: "#ef4444",
  blue: "#3b82f6",
  black: "#555555",
  load: "#22c55e",
  unload: "#ef4444",
  dead: "#333333",
};

function getStationColor(screen: string, custom?: string): string {
  if (custom) return custom;
  if (!screen) return "#333333";
  const key = screen.toLowerCase().trim();
  return COLOR_MAP[key] ?? "#CC0000";
}

/** Light foreground unless the fill is very bright. */
function getTextColor(screen: string, custom?: string): string {
  const bg = getStationColor(screen, custom);
  // Check perceived brightness — light colors get dark text
  const hex = bg.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111111" : "#f0f0f0";
}

// Palette for the color picker
const COLOR_PALETTE = [
  { label: "Auto", value: "" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Yellow", value: "#f59e0b" },
  { label: "Purple", value: "#a855f7" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Pink", value: "#ec4899" },
  { label: "Orange", value: "#f97316" },
  { label: "Teal", value: "#14b8a6" },
  { label: "White", value: "#e5e7eb" },
  { label: "Gray", value: "#555555" },
  { label: "Black", value: "#333333" },
];

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const TOTAL_STATIONS = 18;
const ANGLE_STEP = (2 * Math.PI) / TOTAL_STATIONS; // 20 degrees

const CX = 350; // center x
const CY = 350; // center y
const HUB_R = 80; // hub radius
const SPOKE_INNER = 100; // distance from center to spoke start
const SPOKE_OUTER = 300; // distance from center to spoke tip
const SPOKE_W = 32; // width of petal/spoke (narrower to avoid overlap)
const RX = 10; // corner radius for pill shape
const NUM_OFFSET = 18; // station number inset from tip

/**
 * Angle for station n (1-based). Station 1 is at 6 o'clock (+90°),
 * going clockwise (subtract to go CW in SVG coords).
 */
function stationAngle(n: number): number {
  return Math.PI / 2 - (n - 1) * ANGLE_STEP;
}

// ---------------------------------------------------------------------------
// Single spoke SVG
// ---------------------------------------------------------------------------

interface SpokeProps {
  n: number;
  screen: string;
  customColor?: string;
  selected: boolean;
  onSelect: (n: number) => void;
}

function Spoke({ n, screen, customColor, selected, onSelect }: SpokeProps) {
  const angle = stationAngle(n);
  const deg = (angle * 180) / Math.PI;

  const isEmpty = !screen;
  const fill = isEmpty ? "transparent" : getStationColor(screen, customColor);
  const stroke = isEmpty ? "#555" : getStationColor(screen, customColor);
  const textFill = isEmpty ? "#888" : getTextColor(screen, customColor);

  // The spoke is drawn as a pill at the origin pointing right, then rotated.
  // Length along x: SPOKE_INNER → SPOKE_OUTER (translated so center is at 0,0
  // after we apply a group transform).

  // Midpoint of spoke (for the label)
  const midR = (SPOKE_INNER + SPOKE_OUTER) / 2;
  const midX = CX + midR * Math.cos(angle);
  const midY = CY + midR * Math.sin(angle);

  // Station number at outer tip
  const numR = SPOKE_OUTER - NUM_OFFSET;
  const numX = CX + numR * Math.cos(angle);
  const numY = CY + numR * Math.sin(angle);

  // Compute whether the text should be flipped (for readability)
  const normDeg = ((deg % 360) + 360) % 360;
  const flip = normDeg > 90 && normDeg < 270;

  // Label — rotated along the spoke, so we have more room
  const label = screen.length > 14 ? screen.slice(0, 13) + "\u2026" : screen;

  // Rotation to align text along the spoke
  const textRotation = flip ? deg + 180 : deg;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onSelect(n)}
      role="button"
      tabIndex={0}
      aria-label={`Station ${n}${screen ? ": " + screen : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(n);
      }}
    >
      {/* The petal shape — a rounded rect rotated about the SVG center */}
      <rect
        x={SPOKE_INNER}
        y={-SPOKE_W / 2}
        width={SPOKE_OUTER - SPOKE_INNER}
        height={SPOKE_W}
        rx={RX}
        ry={RX}
        fill={fill}
        stroke={selected ? "#ffffff" : stroke}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray={isEmpty ? "6 4" : "none"}
        opacity={isEmpty ? 0.5 : 0.92}
        transform={`translate(${CX},${CY}) rotate(${deg})`}
      />

      {/* Station number at the outer tip */}
      <text
        x={numX}
        y={numY}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isEmpty ? "#aaa" : textFill}
        fontSize={15}
        fontWeight={700}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {n}
      </text>

      {/* Screen name label rotated along the spoke */}
      {screen && (
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={14}
          fontWeight={600}
          transform={`rotate(${textRotation} ${midX} ${midY})`}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PressCarousel({ value, onChange, availableSides }: PressCarouselProps) {
  const sides: SideKey[] = availableSides && availableSides.length > 0 ? availableSides : ["front", "back"];
  const [activeSide, setActiveSide] = useState<SideKey>(sides[0]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset active side if it's no longer available
  const sidesKey = sides.join(",");
  useEffect(() => {
    if (!sides.includes(activeSide)) {
      setActiveSide(sides[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidesKey]);

  // The stations for whichever side is active
  const activeStations = value[activeSide] ?? [];

  // Build maps: station number → screen name / color
  const screenMap = new Map<number, string>();
  const colorMap = new Map<number, string>();
  for (const s of activeStations) {
    screenMap.set(s.station, s.screen);
    if (s.color) colorMap.set(s.station, s.color);
  }

  // When selection changes, seed the draft from the current value
  useEffect(() => {
    if (selected !== null) {
      setDraft(screenMap.get(selected) ?? "");
      setDraftColor(colorMap.get(selected) ?? "");
      // Focus the input on next tick (allows DOM to settle)
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // When switching sides, deselect and reset draft
  const handleSideSwitch = useCallback(
    (side: SideKey) => {
      if (side === activeSide) return;
      // Commit any pending edit before switching
      if (selected !== null) {
        const trimmed = draft.trim();
        const next = activeStations.filter((s) => s.station !== selected);
        if (trimmed) {
          const entry: Station = { station: selected, screen: trimmed };
          if (draftColor) entry.color = draftColor;
          next.push(entry);
        }
        next.sort((a, b) => a.station - b.station);
        onChange({ ...value, [activeSide]: next });
      }
      setSelected(null);
      setDraft("");
      setDraftColor("");
      setActiveSide(side);
    },
    [activeSide, selected, draft, draftColor, activeStations, value, onChange],
  );

  const commitEdit = useCallback(
    (station: number, screenName: string, color?: string) => {
      const trimmed = screenName.trim();
      const next = activeStations.filter((s) => s.station !== station);
      if (trimmed) {
        const entry: Station = { station, screen: trimmed };
        if (color) entry.color = color;
        next.push(entry);
      }
      next.sort((a, b) => a.station - b.station);
      onChange({ ...value, [activeSide]: next });
    },
    [activeStations, activeSide, value, onChange],
  );

  const handleSelect = useCallback(
    (n: number) => {
      // If re-tapping the same station, deselect
      if (selected === n) {
        setSelected(null);
        return;
      }
      // Commit any pending edit on the previously-selected station
      if (selected !== null) {
        commitEdit(selected, draft, draftColor);
      }
      setSelected(n);
    },
    [selected, draft, draftColor, commitEdit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (selected === null) return;

      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit(selected, draft, draftColor);
        // Advance to next station
        const next = selected < TOTAL_STATIONS ? selected + 1 : 1;
        setSelected(next);
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitEdit(selected, draft, draftColor);
        const next = e.shiftKey
          ? selected > 1
            ? selected - 1
            : TOTAL_STATIONS
          : selected < TOTAL_STATIONS
            ? selected + 1
            : 1;
        setSelected(next);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelected(null);
      }
    },
    [selected, draft, draftColor, commitEdit],
  );

  const handleClear = useCallback(() => {
    if (selected === null) return;
    commitEdit(selected, "");
    setDraft("");
    setDraftColor("");
    inputRef.current?.focus();
  }, [selected, commitEdit]);

  const handleColorPick = useCallback(
    (color: string) => {
      if (selected === null) return;
      setDraftColor(color);
      // Commit immediately so the spoke updates in real time
      commitEdit(selected, draft, color);
    },
    [selected, draft, commitEdit],
  );

  // Assigned stations for summary
  const assigned = activeStations.filter((s) => s.screen);

  // Hub label for active side
  const hubLabel = (SIDE_LABELS[activeSide] ?? activeSide).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* ---------- Side toggle ---------- */}
      {sides.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {sides.map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => handleSideSwitch(side)}
              className={`px-6 py-2 rounded-xl text-sm transition-colors min-h-[44px] ${
                activeSide === side
                  ? "bg-[#CC0000] text-white font-bold"
                  : "bg-[#1e1e1e] text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              {SIDE_LABELS[side]}
            </button>
          ))}
        </div>
      )}

      {/* ---------- SVG press diagram ---------- */}
      <svg
        viewBox="0 0 700 700"
        className="w-full select-none"
        style={{ touchAction: "manipulation" }}
      >
        {/* Background circle (faint ring) */}
        <circle
          cx={CX}
          cy={CY}
          r={SPOKE_OUTER + 22}
          fill="none"
          stroke="#222"
          strokeWidth={1}
        />

        {/* Spokes */}
        {Array.from({ length: TOTAL_STATIONS }, (_, i) => {
          const n = i + 1;
          return (
            <Spoke
              key={n}
              n={n}
              screen={screenMap.get(n) ?? ""}
              customColor={colorMap.get(n)}
              selected={selected === n}
              onSelect={handleSelect}
            />
          );
        })}

        {/* Center hub */}
        <circle cx={CX} cy={CY} r={HUB_R} fill="#181818" stroke="#444" strokeWidth={2} />
        <text
          x={CX}
          y={CY - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ccc"
          fontSize={14}
          fontWeight={700}
          style={{ userSelect: "none" }}
        >
          18-HEAD
        </text>
        <text
          x={CX}
          y={CY + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ccc"
          fontSize={14}
          fontWeight={700}
          style={{ userSelect: "none" }}
        >
          {hubLabel}
        </text>
      </svg>

      {/* ---------- Inline editor ---------- */}
      {selected !== null && (
        <div className="w-full max-w-2xl px-2 space-y-2">
          <div className="flex items-center gap-2">
            {/* Station badge */}
            <span
              className="shrink-0 flex items-center justify-center rounded-full font-bold text-sm"
              style={{
                width: 36,
                height: 36,
                background: getStationColor(screenMap.get(selected) ?? "", colorMap.get(selected)),
                color: getTextColor(screenMap.get(selected) ?? "", colorMap.get(selected)),
              }}
            >
              {selected}
            </span>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Commit when leaving the field (but not if user tapped another spoke —
                // handleSelect already commits in that case). Small delay so click
                // events on the clear/color buttons fire first.
                setTimeout(() => {
                  if (selected !== null) {
                    commitEdit(selected, draft, draftColor);
                  }
                }, 150);
              }}
              placeholder="Screen name (e.g. Underbase, Flash, LOAD)"
              className="flex-1 min-w-0 rounded-lg border border-[#333] bg-[#141414] px-3 py-2 text-[16px] text-white placeholder:text-[#666] outline-none focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000]"
              style={{ fontSize: 16 }} /* iPad: prevent zoom */
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Clear button */}
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 flex items-center justify-center rounded-lg border border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
              style={{ width: 48, height: 48 }}
              aria-label="Clear station"
            >
              <X size={20} className="text-[#888]" />
            </button>
          </div>

          {/* Color picker — only show when station has a name */}
          {draft.trim() && (
            <div className="grid grid-cols-7 gap-2 pt-1">
              {COLOR_PALETTE.map((c) => {
                const isAuto = c.value === "";
                const isSelected = draftColor === c.value;
                const autoColor = getStationColor(draft);
                const swatchColor = isAuto ? autoColor : c.value;

                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => handleColorPick(c.value)}
                    className="flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors"
                    style={{
                      background: isSelected ? "#2a2a2a" : "transparent",
                    }}
                    aria-label={`${c.label} color`}
                  >
                    <span
                      className="rounded-full shrink-0 flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        background: swatchColor,
                        border: isSelected
                          ? "3px solid #ffffff"
                          : "2px solid #444",
                      }}
                    >
                      {isAuto && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: getTextColor(draft),
                          }}
                        >
                          A
                        </span>
                      )}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: isSelected ? "#fff" : "#888" }}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- Station summary ---------- */}
      {assigned.length > 0 && (
        <div className="w-full max-w-2xl px-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888] mb-3">
            Assigned Stations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {assigned.map((s) => (
              <button
                key={s.station}
                type="button"
                onClick={() => handleSelect(s.station)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#1a1a1a] active:bg-[#222] transition-colors border border-transparent hover:border-[#2a2a2a]"
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    width: 32,
                    height: 32,
                    background: getStationColor(s.screen, s.color),
                    color: getTextColor(s.screen, s.color),
                  }}
                >
                  {s.station}
                </span>
                <span className="truncate text-[#ccc] text-sm font-medium">{s.screen}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
