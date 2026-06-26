import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ServiceType } from "@prisma/client";
import {
  sendWhatsAppMessage,
  buildBookingConfirmationMessage,
} from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  let clientId = body.clientId;
  const serviceType = (body.serviceType || "TATTOO") as ServiceType;

  if (body.newClient) {
    const client = await prisma.client.upsert({
      where: { phone: body.newClient.phone },
      update: { name: body.newClient.name },
      create: {
        name: body.newClient.name,
        phone: body.newClient.phone,
      },
    });
    clientId = client.id;
  }

  const isStaff =
    session.user.role === Role.ARTIST || session.user.role === Role.PIERCER;
  const artistId = isStaff ? session.user.id : body.artistId;

  const professional = await prisma.user.findUnique({ where: { id: artistId } });
  if (!professional) {
    return NextResponse.json({ error: "Profissional não encontrado" }, { status: 400 });
  }

  if (serviceType === "TATTOO") {
    if (professional.role !== Role.ARTIST) {
      return NextResponse.json({ error: "Selecione um tatuador" }, { status: 400 });
    }
    if (!body.bodyRegionId && !body.bodyRegionCustom) {
      return NextResponse.json({ error: "Selecione a região do corpo" }, { status: 400 });
    }
    if (!body.tattooStyleId) {
      return NextResponse.json({ error: "Selecione o estilo de tatuagem" }, { status: 400 });
    }
    if (body.bodyRegionId) {
      const ok = await prisma.artistBodyRegion.findFirst({
        where: { artistId, bodyRegionId: body.bodyRegionId },
      });
      if (!ok) {
        return NextResponse.json(
          { error: "Região não disponível para este tatuador" },
          { status: 400 }
        );
      }
    }
    const styleOk = await prisma.artistTattooStyle.findFirst({
      where: { artistId, tattooStyleId: body.tattooStyleId },
    });
    if (!styleOk) {
      return NextResponse.json(
        { error: "Estilo não disponível para este tatuador" },
        { status: 400 }
      );
    }
  } else {
    if (professional.role !== Role.PIERCER) {
      return NextResponse.json({ error: "Selecione um perfurador" }, { status: 400 });
    }
    if (!body.piercingProcedureId) {
      return NextResponse.json({ error: "Selecione o procedimento" }, { status: 400 });
    }
    const procOk = await prisma.piercerProcedure.findFirst({
      where: { piercerId: artistId, piercingProcedureId: body.piercingProcedureId },
    });
    if (!procOk) {
      return NextResponse.json(
        { error: "Procedimento não disponível para este perfurador" },
        { status: 400 }
      );
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      clientId,
      artistId,
      serviceType,
      bodyRegionId: serviceType === "TATTOO" ? body.bodyRegionId || null : null,
      tattooStyleId: serviceType === "TATTOO" ? body.tattooStyleId : null,
      piercingProcedureId:
        serviceType === "PIERCING" ? body.piercingProcedureId : null,
      bodyRegionCustom: body.bodyRegionCustom || null,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      notes: body.notes,
      status: "CONFIRMED",
    },
    include: {
      client: true,
      artist: true,
      bodyRegion: true,
      tattooStyle: true,
      piercingProcedure: true,
    },
  });

  if (body.sendWhatsApp) {
    let extra = "";
    if (serviceType === "TATTOO") {
      const regionName =
        appointment.bodyRegion?.name || appointment.bodyRegionCustom || "";
      extra = `\n\n📍 Região: ${regionName}\n🎨 Estilo: ${appointment.tattooStyle?.name || ""}`;
    } else {
      extra = `\n\n💎 Procedimento: ${appointment.piercingProcedure?.name || ""}`;
    }

    const message =
      buildBookingConfirmationMessage(
        appointment.client.name,
        appointment.artist.name,
        appointment.startAt
      ) + extra;

    await sendWhatsAppMessage(appointment.client.phone, message);
    await prisma.whatsAppMessage.create({
      data: {
        phone: appointment.client.phone,
        direction: "outbound",
        type: "booking",
        content: message,
      },
    });
  }

  return NextResponse.json(appointment);
}
