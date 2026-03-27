import fs from "fs";
import path from "path";
import archiver from "archiver";

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const uploadsDir = path.join(process.cwd(), "uploads");

    if (!fs.existsSync(dbPath)) {
      return Response.json({ error: "Database not found" }, { status: 404 });
    }

    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];

    return new Promise<Response>((resolve, reject) => {
      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const date = new Date().toISOString().split("T")[0];
        resolve(
          new Response(buffer, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="reprint-sheets-full-backup-${date}.zip"`,
              "Content-Length": String(buffer.length),
            },
          })
        );
      });
      archive.on("error", (err: Error) => {
        console.error("Archive error:", err);
        reject(
          Response.json({ error: "Failed to create backup" }, { status: 500 })
        );
      });

      // Add database file
      archive.file(dbPath, { name: "dev.db" });

      // Add uploads directory (if it exists)
      if (fs.existsSync(uploadsDir)) {
        archive.directory(uploadsDir, "uploads");
      }

      archive.finalize();
    });
  } catch (error) {
    console.error("Failed to create full backup:", error);
    return Response.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
