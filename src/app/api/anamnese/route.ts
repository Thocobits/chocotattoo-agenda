import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, buildAnamnesisLinkMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { clientId, sendWhatsApp } = await req.json();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 400 });
  }

  const anamnesis = await prisma.anamnesis.create({
    data: { clientId },
  });

  if (sendWhatsApp) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/anamnese/form/${anamnesis.token}`;
    const message = buildAnamnesisLinkMessage(client.name, link);
    await sendWhatsAppMessage(client.phone, message);
  }

  return NextResponse.json(anamnesis);
}
