import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { sheets: true },
        },
      },
    });

    return Response.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return Response.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return Response.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: { name: name.trim() },
      include: {
        _count: {
          select: { sheets: true },
        },
      },
    });

    return Response.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer:", error);
    return Response.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
