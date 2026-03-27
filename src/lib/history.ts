import { prisma } from "./prisma";

// Fields tracked for field-level diffs
const TRACKED_FIELDS = [
  "jobName",
  "jobDate",
  "garmentType",
  "garmentColor",
  "pieceCount",
  "dryerTemp",
  "dryerSpeed",
  "notes",
  "carousel",
];

interface ChangeEntry {
  from: unknown;
  to: unknown;
}

/**
 * Write a single history row for a sheet.
 */
export async function recordHistory(
  sheetId: string,
  action: string,
  changes: Record<string, ChangeEntry> = {},
  userId?: string | null,
  userName?: string | null
) {
  await prisma.sheetHistory.create({
    data: {
      sheetId,
      action,
      changes: JSON.stringify(changes),
      userId: userId ?? null,
      userName: userName ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Carousel helpers
// ---------------------------------------------------------------------------

interface StationLike {
  station: number;
  screen: string;
  color?: string;
}

interface CarouselLike {
  front?: StationLike[];
  back?: StationLike[];
  leftSleeve?: StationLike[];
  rightSleeve?: StationLike[];
}

const SIDE_NAMES: Record<string, string> = {
  front: "Front Press",
  back: "Back Press",
  leftSleeve: "L Sleeve Press",
  rightSleeve: "R Sleeve Press",
};

function parseCarousel(raw: string): CarouselLike {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { front: parsed, back: [] };
    return parsed as CarouselLike;
  } catch {
    return {};
  }
}

/**
 * Diff two carousel JSON strings and return per-station changes.
 */
function computeCarouselChanges(
  oldJson: string,
  newJson: string
): Record<string, ChangeEntry> {
  const changes: Record<string, ChangeEntry> = {};
  const oldC = parseCarousel(oldJson);
  const newC = parseCarousel(newJson);

  const sides = new Set([
    ...Object.keys(oldC),
    ...Object.keys(newC),
  ]) as Set<keyof CarouselLike>;

  for (const side of sides) {
    const oldStations = (oldC[side] ?? []) as StationLike[];
    const newStations = (newC[side] ?? []) as StationLike[];
    const sideName = SIDE_NAMES[side] ?? side;

    // Build maps: station number → station object
    const oldMap = new Map<number, StationLike>();
    for (const s of oldStations) oldMap.set(s.station, s);
    const newMap = new Map<number, StationLike>();
    for (const s of newStations) newMap.set(s.station, s);

    const allNums = new Set([...oldMap.keys(), ...newMap.keys()]);

    for (const num of allNums) {
      const oldS = oldMap.get(num);
      const newS = newMap.get(num);
      const label = `${sideName} Stn ${num}`;

      if (!oldS && newS) {
        // Station added
        changes[label] = { from: "", to: newS.screen };
      } else if (oldS && !newS) {
        // Station cleared
        changes[label] = { from: oldS.screen, to: "" };
      } else if (oldS && newS) {
        if (oldS.screen !== newS.screen) {
          changes[label] = { from: oldS.screen, to: newS.screen };
        }
        // Skip color hex changes — the screen name is what matters
      }
    }
  }

  return changes;
}

/**
 * Compare old sheet data to incoming updates and return only the fields that
 * actually changed.
 */
export function computeFieldChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, ChangeEntry> {
  const changes: Record<string, ChangeEntry> = {};

  for (const field of TRACKED_FIELDS) {
    if (!(field in newData)) continue;

    const oldVal = oldData[field];
    const newVal = newData[field];

    // Carousel — diff station-by-station
    if (field === "carousel") {
      const oldStr =
        typeof oldVal === "string" ? oldVal : JSON.stringify(oldVal);
      const newStr =
        typeof newVal === "string" ? newVal : JSON.stringify(newVal);
      if (oldStr !== newStr) {
        Object.assign(changes, computeCarouselChanges(oldStr, newStr));
      }
      continue;
    }

    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes[field] = { from: oldVal ?? "", to: newVal ?? "" };
    }
  }

  return changes;
}

interface LocationLike {
  position: string;
  placement?: string;
  inkColors?: string;
  notes?: string;
}

/**
 * Compute a detailed diff between old and new location arrays.
 * Groups locations by position, then compares field-by-field within
 * each group (matched by index).
 */
export function computeLocationChanges(
  oldLocs: LocationLike[],
  newLocs: LocationLike[]
): Record<string, ChangeEntry> {
  const changes: Record<string, ChangeEntry> = {};

  const positions = new Set([
    ...oldLocs.map((l) => l.position),
    ...newLocs.map((l) => l.position),
  ]);

  for (const pos of positions) {
    const oldGroup = oldLocs.filter((l) => l.position === pos);
    const newGroup = newLocs.filter((l) => l.position === pos);
    const maxLen = Math.max(oldGroup.length, newGroup.length);

    for (let i = 0; i < maxLen; i++) {
      const old = oldGroup[i];
      const cur = newGroup[i];
      const label = `${pos} #${i + 1}`;

      if (!old && cur) {
        // Location added
        changes[`${label}`] = {
          from: "",
          to: [cur.placement, cur.inkColors].filter(Boolean).join(" — ") ||
            "added",
        };
        continue;
      }

      if (old && !cur) {
        // Location removed
        changes[`${label}`] = {
          from:
            [old.placement, old.inkColors].filter(Boolean).join(" — ") ||
            "removed",
          to: "",
        };
        continue;
      }

      if (old && cur) {
        if ((old.placement ?? "") !== (cur.placement ?? "")) {
          changes[`${label} Placement`] = {
            from: old.placement ?? "",
            to: cur.placement ?? "",
          };
        }
        if ((old.inkColors ?? "") !== (cur.inkColors ?? "")) {
          changes[`${label} Ink Colors`] = {
            from: old.inkColors ?? "",
            to: cur.inkColors ?? "",
          };
        }
        if ((old.notes ?? "") !== (cur.notes ?? "")) {
          changes[`${label} Notes`] = {
            from: old.notes ?? "",
            to: cur.notes ?? "",
          };
        }
      }
    }
  }

  return changes;
}
