import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { sendWhatsApp } from "@/lib/reminders";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  // Protect with internal secret
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        unit: {
          include: {
            building: true,
            resident: true,
          },
        },
      },
    });

    if (!payment || !payment.receiptUrl) {
      return NextResponse.json(
        { error: "Payment or receipt not found" },
        { status: 404 }
      );
    }

    const expectedAmount = payment.amount;
    // Building doesn't have bankAccount yet - use empty string for now
    const syndicAccount = "";

    // Extract base64 and media type from data URI
    const dataUriMatch = payment.receiptUrl.match(
      /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/
    );
    if (!dataUriMatch) {
      console.error("[process-receipt] Invalid data URI format");
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptStatus: "REJECTED",
          receiptUrl: null,
          receiptAiData: {
            amountMatch: false,
            accountMatch: false,
            confidence: 0,
            notes: "Format d'image invalide",
          },
        },
      });
      return NextResponse.json({ status: "REJECTED" });
    }

    const mediaType = dataUriMatch[1] as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif";
    const base64Data = dataUriMatch[2];

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are analyzing a Moroccan bank transfer receipt (ordre de virement).
Extract the following fields and return ONLY valid JSON, no other text, no markdown:
{
  "amount": number | null,
  "date": "DD/MM/YY" | null,
  "beneficiaryAccount": string | null,
  "beneficiaryName": string | null,
  "referenceNumber": string | null,
  "bank": string | null,
  "hasStamp": boolean,
  "isConfirmed": boolean,
  "confidence": number between 0 and 1,
  "amountMatch": boolean,
  "accountMatch": boolean,
  "notes": string
}
For amountMatch: compare extracted amount to expected amount ${expectedAmount} MAD with ±1 MAD tolerance.
For accountMatch: compare beneficiaryAccount to ${syndicAccount || "UNKNOWN"}, ignoring spaces, dots, and dashes.
confidence reflects image readability (1.0 = perfectly clear, 0.0 = unreadable).`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract text response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON - strip any markdown fences
    let jsonStr = textBlock.text.trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let aiResult;
    try {
      aiResult = JSON.parse(jsonStr);
    } catch {
      console.error("[process-receipt] Failed to parse Claude response:", jsonStr);
      aiResult = {
        confidence: 0,
        amountMatch: false,
        accountMatch: false,
        notes: "Impossible de lire le reçu",
      };
    }

    // Match logic
    const isApproved =
      aiResult.confidence >= 0.7 &&
      aiResult.amountMatch === true &&
      (aiResult.accountMatch === true || !syndicAccount); // Skip account match if no syndic account configured

    // Store ONLY safe metadata (no account numbers, no banking data)
    const safeMetadata = {
      amountMatch: !!aiResult.amountMatch,
      accountMatch: !!aiResult.accountMatch,
      confidence: typeof aiResult.confidence === "number" ? aiResult.confidence : 0,
      extractedDate: aiResult.date || null,
      notes: aiResult.notes || "",
      hasStamp: !!aiResult.hasStamp,
    };

    if (isApproved) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptStatus: "APPROVED_PENDING_RECEIPT",
          approvedAt: new Date(),
          confirmToken: crypto.randomUUID(),
          disputeToken: crypto.randomUUID(),
          receiptUrl: null, // Delete raw image immediately
          receiptAiData: safeMetadata,
        },
      });
    } else {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptStatus: "REJECTED",
          receiptUrl: null, // Delete raw image immediately
          receiptAiData: safeMetadata,
        },
      });
    }

    // Send WhatsApp notification to resident
    if (payment.unit.resident?.phone) {
      const phone = payment.unit.resident.phone;
      try {
        if (isApproved) {
          await sendWhatsApp(
            phone,
            "✅ Votre reçu a été vérifié. Le virement est en cours de traitement. Vous serez notifié dès confirmation de réception par votre syndic.\n\n— Orvane"
          );
        } else {
          const reason = safeMetadata.notes || "Image illisible ou montant incorrect";
          await sendWhatsApp(
            phone,
            `❌ Votre reçu n'a pas pu être vérifié. Problème détecté: ${reason}. Veuillez soumettre un nouveau reçu ou contacter votre syndic.\n\n— Orvane`
          );
        }
      } catch (err) {
        console.error("[process-receipt] WhatsApp notification failed:", err);
      }
    }

    return NextResponse.json({
      status: isApproved ? "APPROVED_PENDING_RECEIPT" : "REJECTED",
    });
  } catch (error) {
    console.error("[process-receipt] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
