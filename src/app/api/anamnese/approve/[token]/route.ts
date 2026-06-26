import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const anamnesis = await prisma.anamnesis.findUnique({
    where: { token },
    include: { client: true },
  });

  if (!anamnesis) {
    return NextResponse.json({ error: "Ficha não encontrada" }, { status: 404 });
  }

  if (anamnesis.hasAllergies === null) {
    return NextResponse.json(
      { error: "Ficha ainda não preenchida pelo cliente" },
      { status: 400 }
    );
  }

  if (anamnesis.status === "APPROVED") {
    return NextResponse.json(
      { error: "Ficha já aprovada", clientName: anamnesis.client.name },
      { status: 400 }
    );
  }

  await prisma.anamnesis.update({
    where: { token },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ clientName: anamnesis.client.name });
}
