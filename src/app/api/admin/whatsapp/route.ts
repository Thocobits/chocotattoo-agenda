import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

  const messages = await prisma.whatsAppMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const conversations = await prisma.whatsAppConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ messages, conversations });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { phone, message } = await req.json();
  if (!phone || !message) {
    return NextResponse.json(
      { error: "Telefone e mensagem são obrigatórios" },
      { status: 400 }
    );
  }

  await sendWhatsAppMessage(phone, message);
  await prisma.whatsAppMessage.create({
    data: {
      phone,
      direction: "outbound",
      type: "general",
      content: message,
    },
  });

  return NextResponse.json({ success: true });
}
