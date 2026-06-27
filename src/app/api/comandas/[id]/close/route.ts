import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEarnings } from "@/lib/utils";
import { PaymentMethod } from "@prisma/client";
import {
  sendWhatsAppMessage,
  buildPostSessionCareMessage,
  buildPostPiercingCareMessage,
} from "@/lib/whatsapp";

const VALID_METHODS: PaymentMethod[] = [
  "PIX",
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const paymentMethod = body.paymentMethod as PaymentMethod;
  const sendWhatsApp = body.sendWhatsApp !== false;

  if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Selecione uma forma de pagamento válida" },
      { status: 400 }
    );
  }

  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: {
      client: true,
      artist: true,
      piercingProcedure: true,
    },
  });

  if (!comanda) {
    return NextResponse.json({ error: "Comanda não encontrada" }, { status: 404 });
  }

  if (comanda.status !== "OPEN") {
    return NextResponse.json({ error: "Comanda já fechada" }, { status: 400 });
  }

  const { artistEarning, studioEarning } = calculateEarnings(
    comanda.totalValue,
    comanda.artistPercent
  );

  const updated = await prisma.comanda.update({
    where: { id },
    data: {
      status: "CLOSED",
      paymentMethod,
      artistEarning,
      studioEarning,
      closedAt: new Date(),
    },
  });

  if (comanda.appointmentId) {
    await prisma.appointment.update({
      where: { id: comanda.appointmentId },
      data: { status: "COMPLETED" },
    });
  }

  if (sendWhatsApp && comanda.client.phone) {
    const settings = await prisma.studioSettings.findUnique({
      where: { id: "default" },
    });
    const studioName = settings?.studioName || "Família Chocotattoo";

    const message =
      comanda.serviceType === "PIERCING"
        ? buildPostPiercingCareMessage(
            comanda.client.name,
            comanda.artist.name,
            studioName,
            comanda.piercingProcedure?.name
          )
        : buildPostSessionCareMessage(
            comanda.client.name,
            comanda.artist.name,
            studioName
          );

    await sendWhatsAppMessage(comanda.client.phone, message, "aftercare");
  }

  return NextResponse.json(updated);
}
