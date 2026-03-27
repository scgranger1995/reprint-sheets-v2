import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const history = await prisma.sheetHistory.findMany({
      where: { sheetId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json(history);
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return Response.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
