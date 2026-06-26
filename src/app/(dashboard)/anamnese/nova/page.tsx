"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  phone: string;
}

export default function NovaAnamnesePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/anamnese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, sendWhatsApp }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar anamnese");
      return;
    }

    const anamnesis = await res.json();
    router.push(`/anamnese/${anamnesis.id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/anamnese" className="text-sm text-[var(--muted)] hover:text-white">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold mt-2">Nova Anamnese</h1>
        <p className="text-[var(--muted)]">
          O cliente receberá um link para preencher a ficha
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.phone}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sendWhatsApp}
            onChange={(e) => setSendWhatsApp(e.target.checked)}
          />
          Enviar link da ficha via WhatsApp
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Criando..." : "Criar Ficha de Anamnese"}
        </button>
      </form>
    </div>
  );
}
