import { NextRequest, NextResponse } from "next/server";
import { getPortalResident } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resident = await getPortalResident(req);
    if (!resident) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: paymentId } = await params;

    // Verify payment belongs to this resident's unit
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        unitId: resident.unitId,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Only allow upload for PENDING, LATE, or REJECTED receipts
    const allowedStatuses = ["PENDING", "LATE", null];
    const allowedReceiptStatuses = ["REJECTED", null, undefined];
    if (
      !allowedStatuses.includes(payment.status) &&
      payment.status !== "PENDING"
    ) {
      // Also allow if receiptStatus is REJECTED (re-upload)
      if (!allowedReceiptStatuses.includes(payment.receiptStatus ?? undefined)) {
        return NextResponse.json(
          { error: "Receipt upload not allowed for this payment status" },
          { status: 400 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPEG or PNG." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 }
      );
    }

    // Resize with sharp to max 1200px, 80% quality
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resized.toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64}`;

    // Store temporarily and set status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptUrl: dataUri,
        receiptUploadedAt: new Date(),
        receiptStatus: "PENDING_APPROVAL",
      },
    });

    // Fire-and-forget call to process-receipt
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    fetch(`${baseUrl}/api/internal/process-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.CRON_SECRET || "",
      },
      body: JSON.stringify({ paymentId }),
    }).catch((err) => {
      console.error("[upload-receipt] Fire-and-forget process-receipt failed:", err);
    });

    return NextResponse.json({ status: "PENDING_APPROVAL" });
  } catch (error) {
    console.error("[upload-receipt] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
