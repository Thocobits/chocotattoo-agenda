import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const anamnesis = await prisma.anamnesis.findUnique({ where: { token } });
  if (!anamnesis) {
    return NextResponse.json({ error: "Ficha não encontrada" }, { status: 404 });
  }

  if (anamnesis.status === "APPROVED") {
    return NextResponse.json({ error: "Ficha já aprovada" }, { status: 400 });
  }

  const body = await req.json();

  const updated = await prisma.anamnesis.update({
    where: { token },
    data: {
      hasAllergies: body.hasAllergies,
      allergiesDetail: body.allergiesDetail || null,
      hasDiabetes: body.hasDiabetes,
      hasHeartProblems: body.hasHeartProblems,
      takesMedication: body.takesMedication,
      medicationDetail: body.medicationDetail || null,
      hasSkinConditions: body.hasSkinConditions,
      skinConditionsDetail: body.skinConditionsDetail || null,
      isPregnant: body.isPregnant,
      hadTattooBefore: body.hadTattooBefore,
      additionalNotes: body.additionalNotes || null,
    },
  });

  return NextResponse.json(updated);
}
