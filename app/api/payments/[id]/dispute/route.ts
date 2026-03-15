import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        disputeToken: token,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Invalid or already used token" },
        { status: 400 }
      );
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptStatus: "DISPUTE",
        disputeToken: null, // Single-use
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/receipts?disputed=true", req.url)
    );
  } catch (error) {
    console.error("[dispute] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
