import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const SQLITE_MAGIC = "SQLite format 3\0";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();

    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const dbBackupPath = dbPath + ".bak";
    const uploadsDir = path.join(process.cwd(), "uploads");

    // Disconnect Prisma before touching the DB file
    await prisma.$disconnect();

    if (filename.endsWith(".db")) {
      // ---- DB-only restore ----

      if (
        buffer.length < 16 ||
        buffer.toString("utf8", 0, 16) !== SQLITE_MAGIC
      ) {
        return Response.json(
          { error: "Invalid SQLite database file" },
          { status: 400 }
        );
      }

      // Back up current DB
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, dbBackupPath);
      }

      fs.writeFileSync(dbPath, buffer);

      return Response.json({
        success: true,
        type: "db",
        message: "Database restored successfully.",
      });
    } else if (filename.endsWith(".zip")) {
      // ---- Full restore (ZIP) ----

      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      // Find dev.db in the zip
      const dbEntry = entries.find(
        (e) => e.entryName === "dev.db" || e.entryName.endsWith("/dev.db")
      );
      if (!dbEntry) {
        return Response.json(
          { error: "No database file (dev.db) found in ZIP." },
          { status: 400 }
        );
      }

      const dbBuffer = dbEntry.getData();
      if (
        dbBuffer.length < 16 ||
        dbBuffer.toString("utf8", 0, 16) !== SQLITE_MAGIC
      ) {
        return Response.json(
          { error: "The database inside the ZIP is not a valid SQLite file." },
          { status: 400 }
        );
      }

      // Back up current DB
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, dbBackupPath);
      }

      // Write restored DB
      fs.writeFileSync(dbPath, dbBuffer);

      // Extract uploads
      const uploadEntries = entries.filter(
        (e) =>
          e.entryName.startsWith("uploads/") &&
          !e.isDirectory &&
          e.entryName !== "uploads/.gitkeep"
      );

      let photosRestored = 0;
      if (uploadEntries.length > 0) {
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        for (const entry of uploadEntries) {
          const name = path.basename(entry.entryName);
          // Safety: only allow expected filenames (UUID-style + extension)
          if (/^[a-zA-Z0-9._-]+$/.test(name)) {
            fs.writeFileSync(path.join(uploadsDir, name), entry.getData());
            photosRestored++;
          }
        }
      }

      return Response.json({
        success: true,
        type: "full",
        message: `Restored database and ${photosRestored} photo${photosRestored === 1 ? "" : "s"}.`,
        photosRestored,
      });
    } else {
      return Response.json(
        { error: "Unsupported file type. Upload a .db or .zip file." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Restore failed:", error);
    return Response.json(
      {
        error:
          "Restore failed. If a backup existed, it has been preserved as dev.db.bak.",
      },
      { status: 500 }
    );
  }
}
