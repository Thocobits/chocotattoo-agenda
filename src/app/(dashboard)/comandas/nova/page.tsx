"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Professional {
  id: string;
  name: string;
  commissionRate: number;
}

interface Client {
  id: string;
  name: string;
}

interface BodyRegion {
  id: string;
  name: string;
  basePrice: number;
}

interface PiercingProcedure {
  id: string;
  name: string;
  basePrice: number;
}

function NovaComandaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const userRole = session?.user?.role;
  const defaultServiceType =
    searchParams.get("serviceType") ||
    (userRole === "PIERCER" ? "PIERCING" : "TATTOO");

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [regions, setRegions] = useState<BodyRegion[]>([]);
  const [procedures, setProcedures] = useState<PiercingProcedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    serviceType: defaultServiceType,
    clientId: searchParams.get("clientId") || "",
    artistId: searchParams.get("artistId") || session?.user?.id || "",
    appointmentId: searchParams.get("appointmentId") || "",
    bodyRegionId: searchParams.get("bodyRegionId") || "",
    bodyRegionCustom: "",
    piercingProcedureId: searchParams.get("piercingProcedureId") || "",
    description: "",
    totalValue: "",
  });

  const isAdmin = userRole === "ADMIN";
  const isArtist = userRole === "ARTIST";

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const url = form.serviceType === "PIERCING" ? "/api/piercers" : "/api/artists";
    fetch(url).then((r) => r.json()).then(setProfessionals);
  }, [form.serviceType, isAdmin]);

  useEffect(() => {
    if (form.serviceType === "TATTOO") {
      fetch("/api/body-regions").then((r) => r.json()).then(setRegions);
    }
  }, [form.serviceType]);

  useEffect(() => {
    const id = form.artistId;
    if (!id || form.serviceType !== "PIERCING") return;
    fetch(`/api/piercers/${id}/options`)
      .then((r) => r.json())
      .then((data) => setProcedures(data.procedures || []));
  }, [form.artistId, form.serviceType]);

  useEffect(() => {
    if (form.bodyRegionId) {
      const region = regions.find((r) => r.id === form.bodyRegionId);
      if (region && region.basePrice > 0 && !form.totalValue) {
        setForm((f) => ({ ...f, totalValue: String(region.basePrice) }));
      }
    }
  }, [form.bodyRegionId, regions, form.totalValue]);

  useEffect(() => {
    if (form.piercingProcedureId) {
      const proc = procedures.find((p) => p.id === form.piercingProcedureId);
      if (proc && proc.basePrice > 0 && !form.totalValue) {
        setForm((f) => ({ ...f, totalValue: String(proc.basePrice) }));
      }
    }
  }, [form.piercingProcedureId, procedures, form.totalValue]);

  const selectedProfessional = professionals.find((p) => p.id === form.artistId);
  const commissionRate =
    selectedProfessional?.commissionRate ||
    session?.user?.commissionRate ||
    50;
  const totalValue = parseFloat(form.totalValue) || 0;
  const artistEarning = (totalValue * commissionRate) / 100;
  const studioEarning = totalValue - artistEarning;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/comandas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        totalValue: parseFloat(form.totalValue),
        appointmentId: form.appointmentId || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao abrir comanda");
      return;
    }

    const comanda = await res.json();
    router.push(`/comandas/${comanda.id}`);
  }

  const staffLabel = form.serviceType === "PIERCING" ? "Perfurador" : "Tatuador";

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1.5">Tipo de serviço</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={form.serviceType === "TATTOO"}
                onChange={() =>
                  setForm({ ...form, serviceType: "TATTOO", artistId: "", piercingProcedureId: "" })
                }
              />
              Tatuagem
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={form.serviceType === "PIERCING"}
                onChange={() =>
                  setForm({ ...form, serviceType: "PIERCING", artistId: "", bodyRegionId: "" })
                }
              />
              Body Pierce
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Cliente</label>
        <select
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          required
        >
          <option value="">Selecione...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1.5">{staffLabel}</label>
          <select
            value={form.artistId}
            onChange={(e) => setForm({ ...form, artistId: e.target.value })}
            required
          >
            <option value="">Selecione...</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.commissionRate}%)
              </option>
            ))}
          </select>
        </div>
      )}

      {form.serviceType === "TATTOO" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">Região do corpo</label>
            <select
              value={form.bodyRegionId}
              onChange={(e) => setForm({ ...form, bodyRegionId: e.target.value })}
            >
              <option value="">Selecione ou descreva abaixo...</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.basePrice > 0 && `(base: R$ ${r.basePrice})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Região personalizada (opcional)
            </label>
            <input
              value={form.bodyRegionCustom}
              onChange={(e) => setForm({ ...form, bodyRegionCustom: e.target.value })}
              placeholder="Ex: parte interna do braço direito"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Descrição da tatuagem</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Estilo, tamanho, detalhes..."
            />
          </div>
        </>
      )}

      {form.serviceType === "PIERCING" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">Procedimento</label>
            <select
              value={form.piercingProcedureId}
              onChange={(e) =>
                setForm({ ...form, piercingProcedureId: e.target.value })
              }
              required={!isArtist}
            >
              <option value="">Selecione...</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.basePrice > 0 && `(base: R$ ${p.basePrice})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Observações</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Joia, lado, detalhes..."
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Valor total (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.totalValue}
          onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
          required
        />
      </div>

      {totalValue > 0 && (
        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">
            Divisão de ganhos ({commissionRate}% {staffLabel.toLowerCase()})
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">{staffLabel}:</span>
            <span className="text-green-400">R$ {artistEarning.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Studio:</span>
            <span className="text-amber-400">R$ {studioEarning.toFixed(2)}</span>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Abrindo..." : "Abrir Comanda"}
      </button>
    </form>
  );
}

export default function NovaComandaPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/comandas" className="text-sm text-[var(--muted)] hover:text-white">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold mt-2">Abrir Comanda</h1>
      </div>
      <Suspense fallback={<div className="card">Carregando...</div>}>
        <NovaComandaForm />
      </Suspense>
    </div>
  );
}
