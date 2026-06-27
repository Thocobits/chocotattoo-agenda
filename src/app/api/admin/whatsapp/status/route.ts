import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  checkWhatsAppConnection,
  getWebhookUrl,
  isWhatsAppConfigured,
} from "@/lib/whatsapp";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const configured = isWhatsAppConfigured();
  const connection = configured
    ? await checkWhatsAppConnection()
    : { ok: false, configured: false, error: "Variáveis não configuradas" };

  return NextResponse.json({
    configured,
    connected: connection.ok,
    phoneNumberId: connection.phoneNumberId || null,
    displayPhone: connection.displayPhone || null,
    verifiedName: connection.verifiedName || null,
    webhookUrl: getWebhookUrl(),
    verifyTokenSet: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    error: connection.error || null,
    missing: [
      !process.env.WHATSAPP_TOKEN && "WHATSAPP_TOKEN",
      !process.env.WHATSAPP_PHONE_NUMBER_ID && "WHATSAPP_PHONE_NUMBER_ID",
      !process.env.WHATSAPP_VERIFY_TOKEN && "WHATSAPP_VERIFY_TOKEN",
    ].filter(Boolean),
  });
}
