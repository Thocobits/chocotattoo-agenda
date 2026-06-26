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

  const artist = await prisma.user.findUnique({
    where: { id, role: "ARTIST", active: true },
    include: {
      bodyRegions: {
        include: { bodyRegion: true },
        where: { bodyRegion: { active: true } },
      },
      tattooStyles: {
        include: { tattooStyle: true },
        where: { tattooStyle: { active: true } },
      },
    },
  });

  if (!artist) {
    return NextResponse.json({ error: "Tatuador não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: artist.id,
    name: artist.name,
    bodyRegions: artist.bodyRegions
      .map((r) => r.bodyRegion)
      .sort((a, b) => a.name.localeCompare(b.name)),
    tattooStyles: artist.tattooStyles
      .map((s) => s.tattooStyle)
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}
