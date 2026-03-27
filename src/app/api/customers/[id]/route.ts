import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sheets: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: {
              select: {
                locations: true,
                photos: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return Response.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return Response.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return Response.json(
      { error: "Failed to fetch customer" },
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
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return Response.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { name: name.trim() },
    });

    return Response.json(customer);
  } catch (error) {
    console.error("Failed to update customer:", error);
    return Response.json(
      { error: "Failed to update customer" },
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

    await prisma.customer.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return Response.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
