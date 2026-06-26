import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();

  const procedure = await prisma.piercingProcedure.create({
    data: {
      name: body.name,
      description: body.description,
      basePrice: body.basePrice,
    },
  });

  const piercers = await prisma.user.findMany({ where: { role: "PIERCER" } });
  await prisma.piercerProcedure.createMany({
    data: piercers.map((p) => ({
      piercerId: p.id,
      piercingProcedureId: procedure.id,
    })),
  });

  return NextResponse.json(procedure);
}
