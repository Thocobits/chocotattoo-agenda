"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PiercingProcedure {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  active: boolean;
}

export default function ProcedimentosAdminPage() {
  const [procedures, setProcedures] = useState<PiercingProcedure[]>([]);
  const [form, setForm] = useState({ name: "", description: "", basePrice: 80 });
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const res = await fetch("/api/piercing-procedures");
    setProcedures(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/piercing-procedures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowNew(false);
    setForm({ name: "", description: "", basePrice: 80 });
    load();
  }

  async function handleUpdate(id: string, data: Partial<PiercingProcedure>) {
    await fetch(`/api/admin/piercing-procedures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-white">
        ← Admin
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">Procedimentos de Perfuração</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          Adicionar Procedimento
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <input
              placeholder="Nome (ex: Tragus, Daith, Conch)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              type="number"
              placeholder="Preço base"
              value={form.basePrice}
              onChange={(e) =>
                setForm({ ...form, basePrice: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--muted)]">
              <th className="p-4">Nome</th>
              <th className="p-4">Descrição</th>
              <th className="p-4">Preço base</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {procedures.map((p) => (
              <tr key={p.id} className="border-b border-[var(--card-border)]">
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4 text-sm text-[var(--muted)]">
                  {p.description || "—"}
                </td>
                <td className="p-4">R$ {p.basePrice.toFixed(2)}</td>
                <td className="p-4">
                  <span
                    className={`badge ${p.active ? "badge-success" : "badge-danger"}`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleUpdate(p.id, { active: !p.active })}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    {p.active ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {procedures.length === 0 && (
          <p className="p-8 text-center text-[var(--muted)]">
            Nenhum procedimento cadastrado
          </p>
        )}
      </div>
    </div>
  );
}
