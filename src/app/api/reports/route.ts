import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const period = req.nextUrl.searchParams.get("period") || "month";
  const now = new Date();

  const start =
    period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const end =
    period === "week" ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);

  const isAdmin = session.user.role === "ADMIN";

  const comandas = await prisma.comanda.findMany({
    where: {
      status: "CLOSED",
      closedAt: { gte: start, lte: end },
      ...(isAdmin ? {} : { artistId: session.user.id }),
    },
    include: { artist: true },
  });

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

  const periodLabel =
    period === "week"
      ? `Semana de ${format(start, "dd/MM", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`
      : format(now, "MMMM yyyy", { locale: ptBR });

  return NextResponse.json({
    period: periodLabel,
    totalTattoos: comandas.length,
    totalRevenue: comandas.reduce((s, c) => s + c.totalValue, 0),
    artistEarnings: comandas.reduce((s, c) => s + c.artistEarning, 0),
    studioEarnings: comandas.reduce((s, c) => s + c.studioEarning, 0),
    byArtist: isAdmin ? Array.from(byArtistMap.values()) : undefined,
  });
}
