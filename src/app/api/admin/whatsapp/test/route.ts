import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { phone } = await req.json();
  if (!phone) {
    return NextResponse.json({ error: "Informe o telefone" }, { status: 400 });
  }

  try {
    await sendWhatsAppMessage(
      phone,
      "✅ *Família Chocotattoo* — teste de conexão WhatsApp OK!\n\nSe recebeu esta mensagem, a API está funcionando. Envie *oi* para abrir o menu.",
      "test"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao enviar teste",
      },
      { status: 500 }
    );
  }
}
