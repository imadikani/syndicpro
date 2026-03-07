import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalResident } from "@/lib/portal-auth";

// GET /api/portal/community — posts for this resident's building
export async function GET(req: NextRequest) {
  try {
    const resident = await getPortalResident(req);
    if (!resident) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const posts = await prisma.communityPost.findMany({
      where: { buildingId: resident.unit.buildingId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return NextResponse.json(posts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/portal/community — create a new post
export async function POST(req: NextRequest) {
  try {
    const resident = await getPortalResident(req);
    if (!resident) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Le message ne peut pas être vide" }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Message trop long (max 500 caractères)" }, { status: 400 });
    }

    const post = await prisma.communityPost.create({
      data: {
        content: content.trim(),
        authorName: resident.name.split(" ")[0],
        buildingId: resident.unit.buildingId,
        residentId: resident.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
