import { getSession, formatDateTime, getServiceTypeLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Plus } from "lucide-react";

const statusBadge: Record<string, string> = {
  SCHEDULED: "badge-info",
  CONFIRMED: "badge-success",
  IN_PROGRESS: "badge-warning",
  COMPLETED: "badge-success",
  CANCELLED: "badge-danger",
  NO_SHOW: "badge-danger",
};

const statusLabel: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export default async function AgendamentosPage() {
  const session = await getSession();
  if (!session) return null;

  const isAdmin = session.user.role === Role.ADMIN;

  const appointments = await prisma.appointment.findMany({
    where: isAdmin ? {} : { artistId: session.user.id },
    include: {
      client: true,
      artist: true,
      comanda: true,
      bodyRegion: true,
      tattooStyle: true,
      piercingProcedure: true,
    },
    orderBy: { startAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-[var(--muted)]">
            {isAdmin
              ? "Todos os agendamentos do estúdio"
              : "Seus agendamentos"}
          </p>
        </div>
        <Link href="/agendamentos/novo" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Novo Agendamento
        </Link>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--muted)]">
              <th className="p-4">Cliente</th>
              {isAdmin && <th className="p-4">Profissional</th>}
              <th className="p-4">Serviço</th>
              <th className="p-4">Detalhe</th>
              <th className="p-4">Data/Hora</th>
              <th className="p-4">Status</th>
              <th className="p-4">Comanda</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((apt) => (
              <tr
                key={apt.id}
                className="border-b border-[var(--card-border)] hover:bg-white/5"
              >
                <td className="p-4">
                  <p className="font-medium">{apt.client.name}</p>
                  <p className="text-sm text-[var(--muted)]">{apt.client.phone}</p>
                </td>
                {isAdmin && <td className="p-4">{apt.artist.name}</td>}
                <td className="p-4 text-sm">
                  {getServiceTypeLabel(apt.serviceType)}
                </td>
                <td className="p-4 text-sm">
                  {apt.serviceType === "PIERCING"
                    ? apt.piercingProcedure?.name || "—"
                    : `${apt.bodyRegion?.name || apt.bodyRegionCustom || "—"}${apt.tattooStyle ? ` • ${apt.tattooStyle.name}` : ""}`}
                </td>
                <td className="p-4">{formatDateTime(apt.startAt)}</td>
                <td className="p-4">
                  <span className={`badge ${statusBadge[apt.status]}`}>
                    {statusLabel[apt.status]}
                  </span>
                </td>
                <td className="p-4">
                  {apt.comanda ? (
                    <Link
                      href={`/comandas/${apt.comanda.id}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      #{apt.comanda.number}
                    </Link>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
                <td className="p-4">
                  <Link
                    href={`/agendamentos/${apt.id}`}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {appointments.length === 0 && (
          <p className="p-8 text-center text-[var(--muted)]">
            Nenhum agendamento encontrado
          </p>
        )}
      </div>
    </div>
  );
}
