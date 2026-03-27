import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordHistory } from "@/lib/history";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = { customerId: id };

    if (search) {
      where.OR = [
        { jobName: { contains: search } },
        { garmentType: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const sheets = await prisma.reprintSheet.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            locations: true,
            photos: true,
          },
        },
      },
    });

    return Response.json(sheets);
  } catch (error) {
    console.error("Failed to fetch sheets:", error);
    return Response.json(
      { error: "Failed to fetch sheets" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return Response.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const defaultCarousel = JSON.stringify({
      front: [
        { station: 2, screen: "Flash" },
        { station: 8, screen: "Flash" },
        { station: 13, screen: "Flash" },
        { station: 16, screen: "Flash" },
      ],
      back: [],
    });

    const sheet = await prisma.reprintSheet.create({
      data: {
        customerId: id,
        carousel: defaultCarousel,
        dryerTemp: "378",
        dryerSpeed: "27 Seconds",
      },
      include: {
        _count: {
          select: {
            locations: true,
            photos: true,
          },
        },
      },
    });

    await recordHistory(sheet.id, "created");

    return Response.json(sheet, { status: 201 });
  } catch (error) {
    console.error("Failed to create sheet:", error);
    return Response.json(
      { error: "Failed to create sheet" },
      { status: 500 }
    );
  }
}
