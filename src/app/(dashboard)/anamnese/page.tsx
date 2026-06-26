import { getSession, formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function AnamneseListPage() {
  const session = await getSession();
  if (!session) return null;

  const anamneses = await prisma.anamnesis.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const statusBadge: Record<string, string> = {
    PENDING: "badge-warning",
    APPROVED: "badge-success",
    REJECTED: "badge-danger",
  };

  const statusLabel: Record<string, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovada",
    REJECTED: "Rejeitada",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Anamnese</h1>
          <p className="text-[var(--muted)]">
            Fichas de saúde dos clientes com aprovação via QR Code
          </p>
        </div>
        <Link href="/anamnese/nova" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Nova Anamnese
        </Link>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--muted)]">
              <th className="p-4">Cliente</th>
              <th className="p-4">Status</th>
              <th className="p-4">Criada em</th>
              <th className="p-4">Aprovada em</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {anamneses.map((a) => (
              <tr
                key={a.id}
                className="border-b border-[var(--card-border)] hover:bg-white/5"
              >
                <td className="p-4">
                  <p className="font-medium">{a.client.name}</p>
                  <p className="text-sm text-[var(--muted)]">{a.client.phone}</p>
                </td>
                <td className="p-4">
                  <span className={`badge ${statusBadge[a.status]}`}>
                    {statusLabel[a.status]}
                  </span>
                </td>
                <td className="p-4 text-sm">{formatDateTime(a.createdAt)}</td>
                <td className="p-4 text-sm">
                  {a.approvedAt ? formatDateTime(a.approvedAt) : "—"}
                </td>
                <td className="p-4">
                  <Link
                    href={`/anamnese/${a.id}`}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    Ver / QR Code
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {anamneses.length === 0 && (
          <p className="p-8 text-center text-[var(--muted)]">
            Nenhuma ficha de anamnese
          </p>
        )}
      </div>
    </div>
  );
}
