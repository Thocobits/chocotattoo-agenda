"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Option {
  id: string;
  name: string;
}

export default function TatuadorOpcoesPage() {
  const params = useParams();
  const artistId = params.id as string;
  const [artistName, setArtistName] = useState("");
  const [allRegions, setAllRegions] = useState<Option[]>([]);
  const [allStyles, setAllStyles] = useState<Option[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/artists/${artistId}/options`)
      .then((r) => r.json())
      .then((data) => {
        setAllRegions(data.allRegions || []);
        setAllStyles(data.allStyles || []);
        setSelectedRegions(data.bodyRegionIds || []);
        setSelectedStyles(data.tattooStyleIds || []);
      });

    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((artists) => {
        const artist = artists.find((a: { id: string }) => a.id === artistId);
        if (artist) setArtistName(artist.name);
      });
  }, [artistId]);

  function toggleRegion(id: string) {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
    setSaved(false);
  }

  function toggleStyle(id: string) {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/admin/artists/${artistId}/options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bodyRegionIds: selectedRegions,
        tattooStyleIds: selectedStyles,
      }),
    });
    setLoading(false);
    setSaved(true);
  }

  return (
    <div>
      <Link href="/admin/tatuadores" className="text-sm text-[var(--muted)] hover:text-white">
        ← Tatuadores
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">
        Opções de agendamento
      </h1>
      <p className="text-[var(--muted)] mb-8">
        {artistName ? `Tatuador: ${artistName}` : "Carregando..."}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Regiões do corpo</h2>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {allRegions.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                  selectedRegions.includes(r.id)
                    ? "bg-[var(--primary)]/20 border border-[var(--primary)]"
                    : "bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(r.id)}
                  onChange={() => toggleRegion(r.id)}
                />
                {r.name}
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Estilos de tatuagem</h2>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {allStyles.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                  selectedStyles.includes(s.id)
                    ? "bg-[var(--primary)]/20 border border-[var(--primary)]"
                    : "bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedStyles.includes(s.id)}
                  onChange={() => toggleStyle(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar opções"}
      </button>
      {saved && (
        <p className="text-green-400 text-sm mt-3">Opções salvas com sucesso!</p>
      )}
    </div>
  );
}
