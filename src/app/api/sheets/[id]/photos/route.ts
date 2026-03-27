import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
];

function getExtension(mimeType: string, originalName: string): string {
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

  if (extMap[mimeType]) return extMap[mimeType];

  // Fallback to original file extension
  const ext = path.extname(originalName).toLowerCase();
  return ext || ".bin";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify sheet exists
    const sheet = await prisma.reprintSheet.findUnique({
      where: { id },
    });

    if (!sheet) {
      return Response.json(
        { error: "Sheet not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_TYPES.includes(mimeType) && !mimeType.startsWith("image/")) {
      return Response.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File size exceeds 25MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = getExtension(mimeType, file.name);
    const filename = `${uuidv4()}${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        sheetId: id,
        filename,
        originalName: file.name,
        mimeType,
      },
    });

    return Response.json(photo, { status: 201 });
  } catch (error) {
    console.error("Failed to upload photo:", error);
    return Response.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sheetId } = await params;
    const photoId = request.nextUrl.searchParams.get("photoId");

    if (!photoId) {
      return Response.json(
        { error: "photoId query parameter is required" },
        { status: 400 }
      );
    }

    // Find the photo ensuring it belongs to this sheet
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        sheetId,
      },
    });

    if (!photo) {
      return Response.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete file from disk
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, photo.filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may already be missing, continue
    }

    // Delete photo record
    await prisma.photo.delete({
      where: { id: photoId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete photo:", error);
    return Response.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
