import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(dbPath)) {
      return Response.json({ error: "Database not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(dbPath);
    const date = new Date().toISOString().split("T")[0];

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="reprint-sheets-${date}.db"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Failed to create DB backup:", error);
    return Response.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
