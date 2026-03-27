@AGENTS.md

# Reprint Sheets — Project Reference

> Digital reprint sheets for Graphic Disorder's screen printing shop.
> Replaces paper forms stored in a file cabinet. Runs on shop iPad via PWA.

---

## Tech Stack

- **Framework:** Next.js 16 (Turbopack) + React 19 + TypeScript
- **Database:** SQLite via Prisma ORM (better-sqlite3 adapter)
- **Icons:** lucide-react
- **Styling:** Tailwind CSS 4 — dark theme (#0a0a0a bg, #141414 surfaces, #CC0000 accent)
- **Deployment:** Shop server on port 3001, iPad accesses via Safari PWA

---

## Dev Commands

```bash
npm run dev                        # Dev server (port 3001, Turbopack)
npm run build                      # Production build
npx prisma db push                 # Push schema to SQLite
npx prisma generate                # Regenerate Prisma client
```

---

## Navigation

```
/customers                              → Customer folder list
/customers/[id]                         → Customer's reprint sheets
/customers/[id]/sheets/[sheetId]        → Sheet editor (main workhorse)
```

---

## Database Schema (4 models)

| Model | Purpose |
|-------|---------|
| **Customer** | Customer folders — name, has many sheets |
| **ReprintSheet** | Core entity — job info, garment, dryer, carousel JSON, belongs to Customer |
| **PrintLocation** | Child of sheet — FRONT/BACK/SPECIAL, placement, ink colors, underbase/white |
| **Photo** | Uploaded proof images — UUID filename, served from uploads/ |

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | /api/customers | List + create customers |
| GET/PUT/DELETE | /api/customers/[id] | Customer CRUD |
| GET/POST | /api/customers/[id]/sheets | List + create sheets for customer |
| GET/PUT/DELETE | /api/sheets/[id] | Sheet CRUD (locations: delete+recreate) |
| POST | /api/sheets/[id]/duplicate | Clone sheet + locations |
| POST/DELETE | /api/sheets/[id]/photos | Upload + delete photos |
| GET | /api/uploads/[filename] | Serve uploaded files |

---

## Press Carousel

- 18-station rotary press shown as SVG with spoke/petal shapes
- NO hardcoded LOAD/UNLOAD positions — user assigns any label to any station
- Stored as JSON: `[{"station":1,"screen":"LOAD"}, {"station":2,"screen":"Underbase"}, ...]`
- Color-coded by screen name (underbase=indigo, flash=amber, load=green, etc.)

---

## Key Patterns

- **Auto-save on blur** — no Save button
- **Locations:** delete + recreate on each save
- **No auth** — open on shop LAN
- **iPad optimized:** 18px input font, 48px touch targets, PWA manifest
- **Customer folders** — sheets organized by customer, not a flat list

---

## UI Theme

- **Background:** #0a0a0a
- **Surfaces:** #141414
- **Borders:** #1e1e1e, inputs #2a2a2a
- **Accent:** #CC0000
- **Text:** white primary, gray-400 labels, gray-500 metadata
