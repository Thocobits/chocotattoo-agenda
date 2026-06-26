import { getSession } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportsClient } from "@/components/ReportsClient";

async function getReportData(artistId?: string) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const comandas = await prisma.comanda.findMany({
    where: {
      status: "CLOSED",
      closedAt: { gte: start, lte: end },
      ...(artistId ? { artistId } : {}),
    },
    include: { artist: true },
  });

  const totalTattoos = comandas.length;
  const totalRevenue = comandas.reduce((s, c) => s + c.totalValue, 0);
  const artistEarnings = comandas.reduce((s, c) => s + c.artistEarning, 0);
  const studioEarnings = comandas.reduce((s, c) => s + c.studioEarning, 0);

  const byArtistMap = new Map<
    string,
    { name: string; count: number; artistEarning: number; studioEarning: number }
  >();

  for (const c of comandas) {
    const existing = byArtistMap.get(c.artistId) || {
      name: c.artist.name,
      count: 0,
      artistEarning: 0,
      studioEarning: 0,
    };
    existing.count++;
    existing.artistEarning += c.artistEarning;
    existing.studioEarning += c.studioEarning;
    byArtistMap.set(c.artistId, existing);
  }

  return {
    period: format(now, "MMMM yyyy", { locale: ptBR }),
    totalTattoos,
    totalRevenue,
    artistEarnings,
    studioEarnings,
    byArtist: Array.from(byArtistMap.values()),
  };
}

export default async function RelatoriosPage() {
  const session = await getSession();
  if (!session) return null;

  const isAdmin = session.user.role === Role.ADMIN;
  const data = await getReportData(isAdmin ? undefined : session.user.id);

  return <ReportsClient initialData={data} isAdmin={isAdmin} />;
}
