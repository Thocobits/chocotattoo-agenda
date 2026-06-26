"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPlus, KeyRound, Mail } from "lucide-react";

interface Piercer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  commissionRate: number;
  active: boolean;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  commissionRate: 50,
  password: "",
  confirmPassword: "",
};

export default function PerfuradoresAdminPage() {
  const [piercers, setPiercers] = useState<Piercer[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPiercers() {
    const res = await fetch("/api/admin/piercers");
    setPiercers(await res.json());
  }

  useEffect(() => {
    loadPiercers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/piercers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        commissionRate: form.commissionRate,
        password: form.password,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erro ao cadastrar");
      return;
    }

    setShowNew(false);
    setForm(emptyForm);
    setSuccess(
      `Perfurador ${data.name} cadastrado! Acesso: ${data.email} / senha definida por você.`
    );
    loadPiercers();
  }

  async function handleUpdate(id: string) {
    setError("");
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      commissionRate: form.commissionRate,
    };

    if (form.password) {
      if (form.password !== form.confirmPassword) {
        setLoading(false);
        setError("As senhas não coincidem");
        return;
      }
      payload.password = form.password;
    }

    const res = await fetch(`/api/admin/piercers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erro ao atualizar");
      return;
    }

    setEditing(null);
    setForm(emptyForm);
    setSuccess(
      form.password
        ? `Dados e senha de ${data.name} atualizados.`
        : `Dados de ${data.name} atualizados.`
    );
    loadPiercers();
  }

  async function toggleActive(piercer: Piercer) {
    await fetch(`/api/admin/piercers/${piercer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !piercer.active }),
    });
    loadPiercers();
  }

  function startEdit(piercer: Piercer) {
    setEditing(piercer.id);
    setShowNew(false);
    setError("");
    setSuccess("");
    setForm({
      name: piercer.name,
      email: piercer.email,
      phone: piercer.phone || "",
      commissionRate: piercer.commissionRate,
      password: "",
      confirmPassword: "",
    });
  }

  function openNewForm() {
    setShowNew(true);
    setEditing(null);
    setError("");
    setSuccess("");
    setForm(emptyForm);
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-white">
        ← Admin
      </Link>
      <div className="flex items-center justify-between mt-2 mb-2">
        <h1 className="text-2xl font-bold">Body Pierce</h1>
        <button
          onClick={openNewForm}
          className="btn-primary flex items-center gap-2"
          disabled={piercers.length >= 10}
        >
          <UserPlus size={18} />
          Cadastrar ({piercers.length}/10)
        </button>
      </div>
      <p className="text-[var(--muted)] text-sm mb-6">
        Cada perfurador acessa a plataforma com email e senha próprios.
      </p>

      {success && (
        <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      {showNew && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <UserPlus size={20} />
            Novo Perfurador — Acesso à Plataforma
          </h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome completo</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Ana Pierce"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email de acesso *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="pierce@chocotattoo.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="5511999999999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">% Comissão</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.commissionRate}
                onChange={(e) =>
                  setForm({ ...form, commissionRate: parseFloat(e.target.value) })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Senha de acesso *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmar senha *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                placeholder="Repita a senha"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Cadastrando..." : "Cadastrar Perfurador"}
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

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdate(editing);
          }}
          className="card mb-6 space-y-4"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <KeyRound size={20} />
            Editar Perfurador
          </h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email de acesso</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">% Comissão</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.commissionRate}
                onChange={(e) =>
                  setForm({ ...form, commissionRate: parseFloat(e.target.value) })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Nova senha (opcional)
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Deixe vazio para manter"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                placeholder="Só se alterar senha"
                minLength={6}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
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
              <th className="p-4">Email (login)</th>
              <th className="p-4">Comissão</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {piercers.map((p) => (
              <tr key={p.id} className="border-b border-[var(--card-border)] hover:bg-white/5">
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Mail size={14} className="text-[var(--muted)]" />
                    {p.email}
                  </span>
                </td>
                <td className="p-4">{p.commissionRate}%</td>
                <td className="p-4">
                  <span
                    className={`badge ${p.active ? "badge-success" : "badge-danger"}`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      Editar
                    </button>
                    <Link
                      href={`/admin/perfuradores/${p.id}/opcoes`}
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      Procedimentos
                    </Link>
                    <button
                      onClick={() => toggleActive(p)}
                      className="text-sm text-[var(--muted)] hover:text-white"
                    >
                      {p.active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {piercers.length === 0 && (
          <p className="p-8 text-center text-[var(--muted)]">
            Nenhum perfurador cadastrado. Clique em Cadastrar para criar o primeiro acesso.
          </p>
        )}
      </div>
    </div>
  );
}
