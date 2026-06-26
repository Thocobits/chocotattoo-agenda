"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Option {
  id: string;
  name: string;
}

export default function PerfuradorOpcoesPage() {
  const params = useParams();
  const piercerId = params.id as string;
  const [piercerName, setPiercerName] = useState("");
  const [allProcedures, setAllProcedures] = useState<Option[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/piercers/${piercerId}/options`)
      .then((r) => r.json())
      .then((data) => {
        setAllProcedures(data.allProcedures || []);
        setSelectedProcedures(data.procedureIds || []);
      });

    fetch("/api/admin/piercers")
      .then((r) => r.json())
      .then((piercers) => {
        const piercer = piercers.find((p: { id: string }) => p.id === piercerId);
        if (piercer) setPiercerName(piercer.name);
      });
  }, [piercerId]);

  function toggleProcedure(id: string) {
    setSelectedProcedures((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/admin/piercers/${piercerId}/options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ procedureIds: selectedProcedures }),
    });
    setLoading(false);
    setSaved(true);
  }

  return (
    <div>
      <Link href="/admin/perfuradores" className="text-sm text-[var(--muted)] hover:text-white">
        ← Body Pierce
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">Procedimentos do perfurador</h1>
      <p className="text-[var(--muted)] mb-8">
        {piercerName ? `Perfurador: ${piercerName}` : "Carregando..."}
      </p>

      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Procedimentos disponíveis</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {allProcedures.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                selectedProcedures.includes(p.id)
                  ? "bg-[var(--primary)]/20 border border-[var(--primary)]"
                  : "bg-white/5"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedProcedures.includes(p.id)}
                onChange={() => toggleProcedure(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar procedimentos"}
      </button>
      {saved && (
        <p className="text-green-400 text-sm mt-3">Procedimentos salvos com sucesso!</p>
      )}
    </div>
  );
}
