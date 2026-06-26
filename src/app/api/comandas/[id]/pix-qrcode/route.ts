import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePixQrCode } from "@/lib/pix";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!comanda) {
    return NextResponse.json({ error: "Comanda não encontrada" }, { status: 404 });
  }

  const description = `Comanda ${comanda.number} - ${comanda.client.name}`;
  const { payload, qrCodeDataUrl } = await generatePixQrCode(
    comanda.totalValue,
    description
  );

  const settings = await prisma.studioSettings.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json({
    qrCode: qrCodeDataUrl,
    payload,
    amount: comanda.totalValue,
    pixKey: settings?.pixKey || "5511982470182",
  });
}
