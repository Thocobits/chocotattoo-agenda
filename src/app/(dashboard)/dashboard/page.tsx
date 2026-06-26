import { getSession, formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { Calendar, Receipt, DollarSign, Users } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const isAdmin = session.user.role === Role.ADMIN;
  const artistFilter = isAdmin ? {} : { artistId: session.user.id };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todayAppointments,
    openComandas,
    monthClosedComandas,
    totalClients,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        ...artistFilter,
        startAt: { gte: today, lt: tomorrow },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.comanda.count({
      where: { ...artistFilter, status: "OPEN" },
    }),
    prisma.comanda.findMany({
      where: {
        ...artistFilter,
        status: "CLOSED",
        closedAt: { gte: startOfMonth },
      },
      select: {
        artistEarning: true,
        studioEarning: true,
        totalValue: true,
      },
    }),
    isAdmin ? prisma.client.count() : Promise.resolve(0),
  ]);

  const monthEarnings = monthClosedComandas.reduce(
    (acc, c) => ({
      artist: acc.artist + c.artistEarning,
      studio: acc.studio + c.studioEarning,
      total: acc.total + c.totalValue,
      count: acc.count + 1,
    }),
    { artist: 0, studio: 0, total: 0, count: 0 }
  );

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      ...artistFilter,
      startAt: { gte: new Date() },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    include: { client: true, artist: true },
    orderBy: { startAt: "asc" },
    take: 5,
  });

  const stats = [
    {
      label: "Agendamentos Hoje",
      value: todayAppointments,
      icon: Calendar,
      color: "text-blue-400",
    },
    {
      label: "Comandas Abertas",
      value: openComandas,
      icon: Receipt,
      color: "text-amber-400",
    },
    {
      label: isAdmin ? "Ganhos do Studio (mês)" : "Seus Ganhos (mês)",
      value: formatCurrency(
        isAdmin ? monthEarnings.studio : monthEarnings.artist
      ),
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: isAdmin ? "Total Clientes" : "Atendimentos (mês)",
      value: isAdmin ? totalClients : monthEarnings.count,
      icon: Users,
      color: "text-purple-400",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Olá, {session.user.name.split(" ")[0]}!
        </h1>
        <p className="text-[var(--muted)]">
          {isAdmin
            ? "Visão geral do estúdio"
            : "Seus agendamentos e comandas"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted)]">{stat.label}</span>
                <Icon size={20} className={stat.color} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Próximos Agendamentos</h2>
            <Link
              href="/agendamentos"
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Ver todos
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">
              Nenhum agendamento próximo
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{apt.client.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {isAdmin && `${apt.artist.name} • `}
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(apt.startAt)}
                    </p>
                  </div>
                  <span className="badge badge-info">{apt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/agendamentos/novo" className="btn-primary text-center">
              Novo Agendamento
            </Link>
            <Link href="/comandas/nova" className="btn-secondary text-center">
              Abrir Comanda
            </Link>
            <Link href="/anamnese/nova" className="btn-secondary text-center">
              Nova Anamnese
            </Link>
            <Link href="/relatorios" className="btn-secondary text-center">
              Ver Relatórios
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
