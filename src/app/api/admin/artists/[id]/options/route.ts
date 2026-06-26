import { NextRequest, NextResponse } from "next/server";
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

  const [allRegions, allStyles, artistRegions, artistStyles] = await Promise.all([
    prisma.bodyRegion.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.tattooStyle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.artistBodyRegion.findMany({ where: { artistId: id } }),
    prisma.artistTattooStyle.findMany({ where: { artistId: id } }),
  ]);

  return NextResponse.json({
    bodyRegionIds: artistRegions.map((r) => r.bodyRegionId),
    tattooStyleIds: artistStyles.map((s) => s.tattooStyleId),
    allRegions,
    allStyles,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { bodyRegionIds, tattooStyleIds } = await req.json();

  await prisma.$transaction([
    prisma.artistBodyRegion.deleteMany({ where: { artistId: id } }),
    prisma.artistTattooStyle.deleteMany({ where: { artistId: id } }),
  ]);

  if (bodyRegionIds?.length) {
    await prisma.artistBodyRegion.createMany({
      data: bodyRegionIds.map((bodyRegionId: string) => ({
        artistId: id,
        bodyRegionId,
      })),
    });
  }

  if (tattooStyleIds?.length) {
    await prisma.artistTattooStyle.createMany({
      data: tattooStyleIds.map((tattooStyleId: string) => ({
        artistId: id,
        tattooStyleId,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
