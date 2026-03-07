import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface PortalPayload {
  residentId: string;
  phone: string;
  type: "portal";
}

export function signPortalToken(payload: Omit<PortalPayload, "type">): string {
  return jwt.sign({ ...payload, type: "portal" }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyPortalToken(token: string): PortalPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as PortalPayload;
    if (decoded.type !== "portal") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getPortalResident(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || req.cookies.get("portal_token")?.value;
  if (!token) return null;

  const payload = verifyPortalToken(token);
  if (!payload) return null;

  const resident = await prisma.resident.findUnique({
    where: { id: payload.residentId },
    include: {
      unit: {
        include: {
          building: true,
        },
      },
    },
  });

  return resident;
}
