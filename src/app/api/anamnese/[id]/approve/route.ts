import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const anamnesis = await prisma.anamnesis.findUnique({ where: { id } });
  if (!anamnesis) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  const updated = await prisma.anamnesis.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
