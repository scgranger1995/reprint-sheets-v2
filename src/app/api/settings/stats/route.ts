import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const [customers, sheets, photos] = await Promise.all([
      prisma.customer.count(),
      prisma.reprintSheet.count(),
      prisma.photo.count(),
    ]);

    // Database file size
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    let dbSizeBytes = 0;
    try {
      dbSizeBytes = fs.statSync(dbPath).size;
    } catch {
      // DB file may not exist yet
    }

    // Uploads directory total size
    const uploadsDir = path.join(process.cwd(), "uploads");
    let uploadsSizeBytes = 0;
    let photoFiles = 0;
    try {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file === ".gitkeep") continue;
        const stat = fs.statSync(path.join(uploadsDir, file));
        if (stat.isFile()) {
          uploadsSizeBytes += stat.size;
          photoFiles++;
        }
      }
    } catch {
      // uploads dir may not exist
    }

    return Response.json({
      customers,
      sheets,
      photos,
      photoFiles,
      dbSizeBytes,
      uploadsSizeBytes,
    });
  } catch (error) {
    console.error("Failed to get stats:", error);
    return Response.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
