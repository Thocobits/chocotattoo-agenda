"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Professional {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface BodyRegion {
  id: string;
  name: string;
}

interface TattooStyle {
  id: string;
  name: string;
  description: string | null;
}

interface PiercingProcedure {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
}

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bodyRegions, setBodyRegions] = useState<BodyRegion[]>([]);
  const [tattooStyles, setTattooStyles] = useState<TattooStyle[]>([]);
  const [procedures, setProcedures] = useState<PiercingProcedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userRole = session?.user?.role;
  const isTattooStaff = userRole === "ARTIST";
  const isPiercerStaff = userRole === "PIERCER";
  const isAdmin = userRole === "ADMIN";

  const [form, setForm] = useState({
    serviceType: isPiercerStaff ? "PIERCING" : "TATTOO",
    clientId: "",
    artistId: isTattooStaff || isPiercerStaff ? session?.user?.id || "" : "",
    bodyRegionId: "",
    bodyRegionCustom: "",
    tattooStyleId: "",
    piercingProcedureId: "",
    date: "",
    startTime: "10:00",
    endTime: "12:00",
    notes: "",
    newClientName: "",
    newClientPhone: "",
    createNewClient: false,
    sendWhatsApp: true,
  });

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  useEffect(() => {
    if (isPiercerStaff) {
      setForm((f) => ({ ...f, serviceType: "PIERCING", artistId: session!.user.id }));
    } else if (isTattooStaff) {
      setForm((f) => ({ ...f, serviceType: "TATTOO", artistId: session!.user.id }));
    }
  }, [session, isPiercerStaff, isTattooStaff]);

  useEffect(() => {
    if (!isAdmin) return;
    const url = form.serviceType === "PIERCING" ? "/api/piercers" : "/api/artists";
    fetch(url).then((r) => r.json()).then(setProfessionals);
    setForm((f) => ({ ...f, artistId: "" }));
  }, [form.serviceType, isAdmin]);

  useEffect(() => {
    const id = form.artistId;
    if (!id) {
      setBodyRegions([]);
      setTattooStyles([]);
      setProcedures([]);
      return;
    }

    if (form.serviceType === "TATTOO") {
      fetch(`/api/artists/${id}/options`)
        .then((r) => r.json())
        .then((data) => {
          setBodyRegions(data.bodyRegions || []);
          setTattooStyles(data.tattooStyles || []);
          setForm((f) => ({
            ...f,
            bodyRegionId: "",
            tattooStyleId: "",
            piercingProcedureId: "",
          }));
        });
    } else {
      fetch(`/api/piercers/${id}/options`)
        .then((r) => r.json())
        .then((data) => {
          setProcedures(data.procedures || []);
          setForm((f) => ({
            ...f,
            piercingProcedureId: "",
            bodyRegionId: "",
            tattooStyleId: "",
          }));
        });
    }
  }, [form.artistId, form.serviceType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const startAt = new Date(`${form.date}T${form.startTime}`);
    const endAt = new Date(`${form.date}T${form.endTime}`);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: form.serviceType,
        clientId: form.createNewClient ? undefined : form.clientId,
        newClient: form.createNewClient
          ? { name: form.newClientName, phone: form.newClientPhone }
          : undefined,
        artistId: form.artistId,
        bodyRegionId: form.bodyRegionId || undefined,
        bodyRegionCustom: form.bodyRegionCustom || undefined,
        tattooStyleId: form.tattooStyleId || undefined,
        piercingProcedureId: form.piercingProcedureId || undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        notes: form.notes,
        sendWhatsApp: form.sendWhatsApp,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar agendamento");
      return;
    }

    router.push("/agendamentos");
    router.refresh();
  }

  const selectedRegion = bodyRegions.find((r) => r.id === form.bodyRegionId);
  const isOtherRegion = selectedRegion?.name === "Outro";

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/agendamentos" className="text-sm text-[var(--muted)] hover:text-white">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold mt-2">Novo Agendamento</h1>
      </div>

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
                  onChange={() => setForm({ ...form, serviceType: "TATTOO" })}
                />
                Tatuagem
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.serviceType === "PIERCING"}
                  onChange={() => setForm({ ...form, serviceType: "PIERCING" })}
                />
                Body Pierce
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!form.createNewClient}
              onChange={() => setForm({ ...form, createNewClient: false })}
            />
            Cliente existente
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={form.createNewClient}
              onChange={() => setForm({ ...form, createNewClient: true })}
            />
            Novo cliente
          </label>
        </div>

        {form.createNewClient ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome</label>
              <input
                value={form.newClientName}
                onChange={(e) => setForm({ ...form, newClientName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
              <input
                value={form.newClientPhone}
                onChange={(e) => setForm({ ...form, newClientPhone: e.target.value })}
                placeholder="5511999999999"
                required
              />
            </div>
          </div>
        ) : (
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
                  {c.name} - {c.phone}
                </option>
              ))}
            </select>
          </div>
        )}

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {form.serviceType === "PIERCING" ? "Perfurador" : "Tatuador"}
            </label>
            <select
              value={form.artistId}
              onChange={(e) => setForm({ ...form, artistId: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.artistId && form.serviceType === "TATTOO" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">Região do corpo *</label>
              <select
                value={form.bodyRegionId}
                onChange={(e) =>
                  setForm({ ...form, bodyRegionId: e.target.value, bodyRegionCustom: "" })
                }
                required
              >
                <option value="">Selecione...</option>
                {bodyRegions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            {isOtherRegion && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Descreva a região</label>
                <input
                  value={form.bodyRegionCustom}
                  onChange={(e) => setForm({ ...form, bodyRegionCustom: e.target.value })}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">Estilo de tatuagem *</label>
              <select
                value={form.tattooStyleId}
                onChange={(e) => setForm({ ...form, tattooStyleId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {tattooStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {form.artistId && form.serviceType === "PIERCING" && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Procedimento *</label>
            <select
              value={form.piercingProcedureId}
              onChange={(e) => setForm({ ...form, piercingProcedureId: e.target.value })}
              required
            >
              <option value="">Selecione o procedimento...</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.basePrice > 0 ? ` — R$ ${p.basePrice.toFixed(2)}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Data</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Início</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Fim</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.sendWhatsApp}
            onChange={(e) => setForm({ ...form, sendWhatsApp: e.target.checked })}
          />
          Enviar confirmação via WhatsApp
        </label>

        <button type="submit" disabled={loading || !form.artistId} className="btn-primary w-full">
          {loading ? "Salvando..." : "Criar Agendamento"}
        </button>
      </form>
    </div>
  );
}
