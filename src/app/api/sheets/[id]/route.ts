import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  recordHistory,
  computeFieldChanges,
  computeLocationChanges,
} from "@/lib/history";
import path from "path";
import fs from "fs/promises";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sheet = await prisma.reprintSheet.findUnique({
      where: { id },
      include: {
        customer: true,
        locations: {
          orderBy: { sortOrder: "asc" },
        },
        photos: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!sheet) {
      return Response.json(
        { error: "Sheet not found" },
        { status: 404 }
      );
    }

    return Response.json(sheet);
  } catch (error) {
    console.error("Failed to fetch sheet:", error);
    return Response.json(
      { error: "Failed to fetch sheet" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Separate locations from the rest of the body
    const { locations, photos: _photos, customer: _customer, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...sheetData } = body;

    // Fetch current state for diff
    const before = await prisma.reprintSheet.findUnique({
      where: { id },
      include: { locations: true },
    });

    // Update the sheet fields
    const sheet = await prisma.reprintSheet.update({
      where: { id },
      data: sheetData,
    });

    // If locations are provided, delete all existing and recreate
    if (Array.isArray(locations)) {
      await prisma.printLocation.deleteMany({
        where: { sheetId: id },
      });

      if (locations.length > 0) {
        await prisma.printLocation.createMany({
          data: locations.map(
            (
              loc: {
                position?: string;
                placement?: string;
                size?: string;
                inkColors?: string;
                hasUnderbase?: boolean;
                hasWhite?: boolean;
                notes?: string;
                sortOrder?: number;
              },
              index: number
            ) => ({
              sheetId: id,
              position: loc.position ?? "FRONT",
              placement: loc.placement ?? "",
              size: loc.size ?? "",
              inkColors: loc.inkColors ?? "",
              hasUnderbase: loc.hasUnderbase ?? false,
              hasWhite: loc.hasWhite ?? false,
              notes: loc.notes ?? "",
              sortOrder: loc.sortOrder ?? index,
            })
          ),
        });
      }
    }

    // ---- Record history ----
    if (before) {
      const changes = computeFieldChanges(
        before as unknown as Record<string, unknown>,
        sheetData
      );

      // Track detailed location changes
      if (Array.isArray(locations)) {
        const locChanges = computeLocationChanges(before.locations, locations);
        Object.assign(changes, locChanges);
      }

      if (Object.keys(changes).length > 0) {
        await recordHistory(id, "updated", changes);
      }
    }

    // Fetch and return the updated sheet with relations
    const updatedSheet = await prisma.reprintSheet.findUnique({
      where: { id },
      include: {
        customer: true,
        locations: {
          orderBy: { sortOrder: "asc" },
        },
        photos: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return Response.json(updatedSheet);
  } catch (error) {
    console.error("Failed to update sheet:", error);
    return Response.json(
      { error: "Failed to update sheet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get photos to delete their files
    const photos = await prisma.photo.findMany({
      where: { sheetId: id },
    });

    // Delete photo files from uploads/
    const uploadsDir = path.join(process.cwd(), "uploads");
    for (const photo of photos) {
      const filePath = path.join(uploadsDir, photo.filename);
      try {
        await fs.unlink(filePath);
      } catch {
        // File may already be missing, continue
      }
    }

    // Delete sheet (cascades to locations and photos)
    await prisma.reprintSheet.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sheet:", error);
    return Response.json(
      { error: "Failed to delete sheet" },
      { status: 500 }
    );
  }
}
