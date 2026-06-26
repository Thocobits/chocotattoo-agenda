import { getSession } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { ComandaDetail } from "@/components/ComandaDetail";

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: { client: true, artist: true, bodyRegion: true, piercingProcedure: true },
  });

  if (!comanda) notFound();

  const isAdmin = session.user.role === Role.ADMIN;
  if (!isAdmin && comanda.artistId !== session.user.id) notFound();

  return (
    <ComandaDetail
      comanda={{
        ...comanda,
        openedAt: comanda.openedAt.toISOString(),
        closedAt: comanda.closedAt?.toISOString() || null,
      }}
    />
  );
}
