import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordHistory } from "@/lib/history";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the original sheet with locations
    const original = await prisma.reprintSheet.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!original) {
      return Response.json(
        { error: "Sheet not found" },
        { status: 404 }
      );
    }

    // Clone the sheet with today's date beside the name
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(2);
    const dateStr = `${mm}/${dd}/${yy}`;
    const todayISO = `${today.getFullYear()}-${mm}-${dd}`;

    const newSheet = await prisma.reprintSheet.create({
      data: {
        customerId: original.customerId,
        jobName: original.jobName ? `${original.jobName} ${dateStr}` : dateStr,
        jobDate: todayISO,
        garmentType: original.garmentType,
        garmentColor: original.garmentColor,
        pieceCount: original.pieceCount,
        frontTime: original.frontTime,
        backTime: original.backTime,
        dryerTemp: original.dryerTemp,
        dryerSpeed: original.dryerSpeed,
        notes: original.notes,
        carousel: original.carousel,
        locations: {
          create: original.locations.map((loc) => ({
            position: loc.position,
            placement: loc.placement,
            size: loc.size,
            inkColors: loc.inkColors,
            hasUnderbase: loc.hasUnderbase,
            hasWhite: loc.hasWhite,
            notes: loc.notes,
            sortOrder: loc.sortOrder,
          })),
        },
      },
      include: {
        customer: true,
        locations: {
          orderBy: { sortOrder: "asc" },
        },
        photos: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            locations: true,
            photos: true,
          },
        },
      },
    });

    await recordHistory(newSheet.id, "duplicated", {
      source: { from: original.jobName || original.id, to: newSheet.jobName },
    });

    return Response.json(newSheet, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate sheet:", error);
    return Response.json(
      { error: "Failed to duplicate sheet" },
      { status: 500 }
    );
  }
}
