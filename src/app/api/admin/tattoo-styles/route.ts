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

  const style = await prisma.tattooStyle.create({
    data: {
      name: body.name,
      description: body.description,
      priceMultiplier: body.priceMultiplier,
    },
  });

  const artists = await prisma.user.findMany({ where: { role: "ARTIST" } });
  await prisma.artistTattooStyle.createMany({
    data: artists.map((a) => ({
      artistId: a.id,
      tattooStyleId: style.id,
    })),
  });

  return NextResponse.json(style);
}
