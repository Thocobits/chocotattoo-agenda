import { getSession, formatDateTime, formatCurrency, getServiceTypeLabel, getRoleLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AgendamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      client: true,
      artist: true,
      comanda: true,
      bodyRegion: true,
      tattooStyle: true,
      piercingProcedure: true,
    },
  });

  if (!appointment) notFound();

  const isAdmin = session.user.role === Role.ADMIN;
  if (!isAdmin && appointment.artistId !== session.user.id) notFound();

  const comandaParams = new URLSearchParams({
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    artistId: appointment.artistId,
    serviceType: appointment.serviceType,
    bodyRegionId: appointment.bodyRegionId || "",
    tattooStyleId: appointment.tattooStyleId || "",
    piercingProcedureId: appointment.piercingProcedureId || "",
  });

  return (
    <div className="max-w-2xl">
      <Link href="/agendamentos" className="text-sm text-[var(--muted)] hover:text-white">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Detalhes do Agendamento</h1>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Cliente</p>
            <p className="font-medium">{appointment.client.name}</p>
            <p className="text-sm">{appointment.client.phone}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Profissional</p>
            <p className="font-medium">{appointment.artist.name}</p>
            <p className="text-sm text-[var(--muted)]">
              {getRoleLabel(appointment.artist.role)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Serviço</p>
            <p className="font-medium">{getServiceTypeLabel(appointment.serviceType)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Status</p>
            <p>{appointment.status}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Início</p>
            <p>{formatDateTime(appointment.startAt)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Fim</p>
            <p>{formatDateTime(appointment.endAt)}</p>
          </div>
          {appointment.serviceType === "TATTOO" ? (
            <>
              <div>
                <p className="text-sm text-[var(--muted)]">Região do corpo</p>
                <p className="font-medium">
                  {appointment.bodyRegion?.name || appointment.bodyRegionCustom || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Estilo</p>
                <p className="font-medium">{appointment.tattooStyle?.name || "—"}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-[var(--muted)]">Procedimento</p>
              <p className="font-medium">{appointment.piercingProcedure?.name || "—"}</p>
            </div>
          )}
        </div>

        {appointment.notes && (
          <div>
            <p className="text-sm text-[var(--muted)]">Observações</p>
            <p>{appointment.notes}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-[var(--card-border)]">
          {!appointment.comanda && (
            <Link
              href={`/comandas/nova?${comandaParams.toString()}`}
              className="btn-primary"
            >
              Abrir Comanda
            </Link>
          )}
          {appointment.comanda && (
            <Link href={`/comandas/${appointment.comanda.id}`} className="btn-secondary">
              Ver Comanda #{appointment.comanda.number}
              {appointment.comanda.status === "CLOSED" &&
                ` - ${formatCurrency(appointment.comanda.totalValue)}`}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
