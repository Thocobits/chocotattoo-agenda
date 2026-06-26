import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ServiceType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const isStaff =
    session.user.role === Role.ARTIST || session.user.role === Role.PIERCER;
  const artistId = isStaff ? session.user.id : body.artistId;
  const serviceType = (body.serviceType || "TATTOO") as ServiceType;

  const professional = await prisma.user.findUnique({ where: { id: artistId } });
  if (!professional) {
    return NextResponse.json({ error: "Profissional não encontrado" }, { status: 400 });
  }

  const lastComanda = await prisma.comanda.findFirst({
    orderBy: { number: "desc" },
  });
  const number = (lastComanda?.number || 0) + 1;

  const comanda = await prisma.comanda.create({
    data: {
      number,
      clientId: body.clientId,
      artistId,
      appointmentId: body.appointmentId,
      serviceType,
      bodyRegionId: serviceType === "TATTOO" ? body.bodyRegionId || null : null,
      piercingProcedureId:
        serviceType === "PIERCING" ? body.piercingProcedureId || null : null,
      bodyRegionCustom: body.bodyRegionCustom || null,
      description: body.description,
      totalValue: body.totalValue,
      artistPercent: professional.commissionRate,
      status: "OPEN",
    },
  });

  return NextResponse.json(comanda);
}
