import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const anamnesis = await prisma.anamnesis.findUnique({ where: { id } });
  if (!anamnesis) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const approveUrl = `${baseUrl}/anamnese/approve/${anamnesis.token}`;
  const qrCode = await QRCode.toDataURL(approveUrl);

  return NextResponse.json({ qrCode, token: anamnesis.token });
}
