"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TattooStyle {
  id: string;
  name: string;
  description: string | null;
  priceMultiplier: number;
  active: boolean;
}

export default function EstilosAdminPage() {
  const [styles, setStyles] = useState<TattooStyle[]>([]);
  const [form, setForm] = useState({ name: "", description: "", priceMultiplier: 1 });
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const res = await fetch("/api/tattoo-styles");
    setStyles(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/tattoo-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowNew(false);
    setForm({ name: "", description: "", priceMultiplier: 1 });
    load();
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/admin/tattoo-styles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-white">
        ← Admin
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">Estilos de Tatuagem</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          Adicionar Estilo
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <input
              placeholder="Nome (ex: Fine Line)"
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
              step="0.1"
              placeholder="Multiplicador de preço"
              value={form.priceMultiplier}
              onChange={(e) =>
                setForm({ ...form, priceMultiplier: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Salvar</button>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--muted)]">
              <th className="p-4">Estilo</th>
              <th className="p-4">Descrição</th>
              <th className="p-4">Multiplicador</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {styles.map((s) => (
              <tr key={s.id} className="border-b border-[var(--card-border)]">
                <td className="p-4 font-medium">{s.name}</td>
                <td className="p-4 text-sm text-[var(--muted)]">{s.description || "—"}</td>
                <td className="p-4">{s.priceMultiplier}x</td>
                <td className="p-4">
                  <span className={`badge ${s.active ? "badge-success" : "badge-danger"}`}>
                    {s.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggle(s.id, s.active)}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    {s.active ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
