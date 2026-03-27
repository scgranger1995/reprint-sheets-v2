import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Sanitize filename — only allow alphanumeric, hyphens, dots, underscores
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return new Response("Invalid filename", { status: 400 });
    }

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, safeFilename);

    // Ensure the resolved path is still within uploads/
    if (!filePath.startsWith(uploadsDir)) {
      return new Response("Invalid path", { status: 400 });
    }

    // Read the file
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch {
      return new Response("File not found", { status: 404 });
    }

    // Determine content type
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to serve file:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
