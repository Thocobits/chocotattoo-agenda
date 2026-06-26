import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const piercer = await prisma.user.findUnique({
    where: { id, role: "PIERCER", active: true },
    include: {
      piercingProcedures: {
        include: { piercingProcedure: true },
        where: { piercingProcedure: { active: true } },
      },
    },
  });

  if (!piercer) {
    return NextResponse.json({ error: "Perfurador não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: piercer.id,
    name: piercer.name,
    procedures: piercer.piercingProcedures
      .map((p) => p.piercingProcedure)
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}
