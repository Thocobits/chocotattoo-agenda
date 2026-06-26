import { getSession, formatCurrency, formatDateTime, getServiceTypeLabel } from "@/lib/utils";
import { getPaymentMethodLabel } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ComandasPage() {
  const session = await getSession();
  if (!session) return null;

  const isAdmin = session.user.role === Role.ADMIN;

  const comandas = await prisma.comanda.findMany({
    where: isAdmin ? {} : { artistId: session.user.id },
    include: {
      client: true,
      artist: true,
      bodyRegion: true,
      piercingProcedure: true,
    },
    orderBy: { openedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Comandas</h1>
          <p className="text-[var(--muted)]">
            Gerencie comandas abertas e fechadas
          </p>
        </div>
        <Link href="/comandas/nova" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Abrir Comanda
        </Link>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--muted)]">
              <th className="p-4">#</th>
              <th className="p-4">Cliente</th>
              {isAdmin && <th className="p-4">Profissional</th>}
              <th className="p-4">Serviço</th>
              <th className="p-4">Detalhe</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4">Pagamento</th>
              <th className="p-4">Aberta em</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {comandas.map((c) => (
              <tr
                key={c.id}
                className="border-b border-[var(--card-border)] hover:bg-white/5"
              >
                <td className="p-4 font-mono">#{c.number}</td>
                <td className="p-4">{c.client.name}</td>
                {isAdmin && <td className="p-4">{c.artist.name}</td>}
                <td className="p-4 text-sm">{getServiceTypeLabel(c.serviceType)}</td>
                <td className="p-4">
                  {c.serviceType === "PIERCING"
                    ? c.piercingProcedure?.name || "—"
                    : c.bodyRegion?.name || c.bodyRegionCustom || "—"}
                </td>
                <td className="p-4 font-medium">{formatCurrency(c.totalValue)}</td>
                <td className="p-4">
                  <span
                    className={`badge ${
                      c.status === "OPEN" ? "badge-warning" : "badge-success"
                    }`}
                  >
                    {c.status === "OPEN" ? "Aberta" : "Fechada"}
                  </span>
                </td>
                <td className="p-4 text-sm">
                  {c.status === "CLOSED"
                    ? getPaymentMethodLabel(c.paymentMethod)
                    : "—"}
                </td>
                <td className="p-4 text-sm">{formatDateTime(c.openedAt)}</td>
                <td className="p-4">
                  <Link
                    href={`/comandas/${c.id}`}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    {c.status === "OPEN" ? "Gerenciar" : "Ver"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {comandas.length === 0 && (
          <p className="p-8 text-center text-[var(--muted)]">
            Nenhuma comanda encontrada
          </p>
        )}
      </div>
    </div>
  );
}
