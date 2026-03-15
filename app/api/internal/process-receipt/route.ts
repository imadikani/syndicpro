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

    console.log('[receipt:start] paymentId:', paymentId);

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

    console.log('[receipt:payment] amount:', payment.amount, 'resident:', payment.unit.resident?.name);
    console.log('[receipt:image] base64 length:', payment.receiptUrl?.length ?? 'NULL - image missing!');

    // Extract base64 and media type from data URI
    const dataUriMatch = payment.receiptUrl.match(
      /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/
    );
    if (!dataUriMatch) {
      console.error("[receipt:error] Invalid data URI format");
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptStatus: "REJECTED",
          receiptUrl: null,
          receiptAiData: {
            amountMatch: false,
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

    const prompt = `You are analyzing a Moroccan bank transfer receipt (ordre de virement confirmé).
Extract the following fields and return ONLY valid JSON with no other text, no markdown, no code fences:
{
  "amount": number | null,
  "date": "DD/MM/YY" | null,
  "beneficiaryName": string | null,
  "referenceNumber": string | null,
  "bank": string | null,
  "hasStamp": boolean,
  "isConfirmed": boolean,
  "confidence": number,
  "amountMatch": boolean,
  "notes": string
}
For amountMatch: compare extracted amount to expected amount ${payment.amount} MAD with ±1 MAD tolerance.
confidence reflects image readability: 1.0 = perfectly clear and readable, 0.0 = completely unreadable.
Do NOT extract, include, or return any bank account numbers under any circumstances.`;

    console.log('[receipt:claude:calling] expected amount:', payment.amount);

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

    console.log('[receipt:claude:raw]', JSON.stringify(response.content));

    // Parse JSON - strip any markdown fences
    let jsonStr = textBlock.text.trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let aiResult;
    try {
      aiResult = JSON.parse(jsonStr);
    } catch {
      console.error("[receipt:error] Failed to parse Claude response:", jsonStr);
      aiResult = {
        confidence: 0,
        amountMatch: false,
        notes: "Impossible de lire le reçu",
      };
    }

    console.log('[receipt:parsed]', JSON.stringify(aiResult));

    // Match logic — amount only, no account matching
    const isMatch =
      aiResult.confidence >= 0.7 &&
      aiResult.amountMatch === true;

    console.log('[receipt:match] confidence:', aiResult.confidence, 'amountMatch:', aiResult.amountMatch, '→', isMatch ? 'APPROVED' : 'REJECTED');

    // Store ONLY safe metadata (no account numbers, no banking data)
    const safeMetadata = {
      amountMatch: !!aiResult.amountMatch,
      confidence: typeof aiResult.confidence === "number" ? aiResult.confidence : 0,
      extractedDate: aiResult.date || null,
      bank: aiResult.bank || null,
      hasStamp: !!aiResult.hasStamp,
      isConfirmed: !!aiResult.isConfirmed,
      notes: aiResult.notes || "",
    };

    if (isMatch) {
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

    console.log('[receipt:done] new status:', isMatch ? 'APPROVED_PENDING_RECEIPT' : 'REJECTED');

    // Send WhatsApp notification to resident
    if (payment.unit.resident?.phone) {
      const phone = payment.unit.resident.phone;
      try {
        if (isMatch) {
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
        console.error("[receipt:whatsapp] notification failed:", err);
      }
    }

    return NextResponse.json({
      status: isMatch ? "APPROVED_PENDING_RECEIPT" : "REJECTED",
    });
  } catch (error) {
    console.error("[receipt:error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
