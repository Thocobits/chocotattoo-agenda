import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const [allProcedures, piercerProcedures] = await Promise.all([
    prisma.piercingProcedure.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.piercerProcedure.findMany({ where: { piercerId: id } }),
  ]);

  return NextResponse.json({
    procedureIds: piercerProcedures.map((p) => p.piercingProcedureId),
    allProcedures,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { procedureIds } = await req.json();

  await prisma.piercerProcedure.deleteMany({ where: { piercerId: id } });

  if (procedureIds?.length) {
    await prisma.piercerProcedure.createMany({
      data: procedureIds.map((piercingProcedureId: string) => ({
        piercerId: id,
        piercingProcedureId,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
