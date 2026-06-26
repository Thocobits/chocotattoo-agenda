"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { Logo } from "@/components/Logo";

export default function AnamneseFormPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    hasAllergies: false,
    allergiesDetail: "",
    hasDiabetes: false,
    hasHeartProblems: false,
    takesMedication: false,
    medicationDetail: "",
    hasSkinConditions: false,
    skinConditionsDetail: "",
    isPregnant: false,
    hadTattooBefore: false,
    additionalNotes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/anamnese/form/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao enviar ficha");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">Ficha Enviada!</h1>
          <p className="text-[var(--muted)]">
            Apresente o QR Code recebido no estúdio no dia da sua sessão.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Ficha de Anamnese</h1>
          <p className="text-[var(--muted)]">
            Preencha com atenção antes da sua sessão de tatuagem
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <CheckboxField
            label="Possui alergias?"
            checked={form.hasAllergies}
            onChange={(v) => setForm({ ...form, hasAllergies: v })}
            detail={form.allergiesDetail}
            onDetailChange={(v) => setForm({ ...form, allergiesDetail: v })}
            detailPlaceholder="Descreva suas alergias"
          />

          <CheckboxField
            label="Possui diabetes?"
            checked={form.hasDiabetes}
            onChange={(v) => setForm({ ...form, hasDiabetes: v })}
          />

          <CheckboxField
            label="Possui problemas cardíacos?"
            checked={form.hasHeartProblems}
            onChange={(v) => setForm({ ...form, hasHeartProblems: v })}
          />

          <CheckboxField
            label="Faz uso de medicação contínua?"
            checked={form.takesMedication}
            onChange={(v) => setForm({ ...form, takesMedication: v })}
            detail={form.medicationDetail}
            onDetailChange={(v) => setForm({ ...form, medicationDetail: v })}
            detailPlaceholder="Quais medicamentos?"
          />

          <CheckboxField
            label="Possui condições de pele?"
            checked={form.hasSkinConditions}
            onChange={(v) => setForm({ ...form, hasSkinConditions: v })}
            detail={form.skinConditionsDetail}
            onDetailChange={(v) => setForm({ ...form, skinConditionsDetail: v })}
            detailPlaceholder="Descreva a condição"
          />

          <CheckboxField
            label="Está grávida?"
            checked={form.isPregnant}
            onChange={(v) => setForm({ ...form, isPregnant: v })}
          />

          <CheckboxField
            label="Já fez tatuagem antes?"
            checked={form.hadTattooBefore}
            onChange={(v) => setForm({ ...form, hadTattooBefore: v })}
          />

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Observações adicionais
            </label>
            <textarea
              value={form.additionalNotes}
              onChange={(e) =>
                setForm({ ...form, additionalNotes: e.target.value })
              }
              rows={3}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Enviando..." : "Enviar Ficha"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  detail,
  onDetailChange,
  detailPlaceholder,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  detail?: string;
  onDetailChange?: (v: string) => void;
  detailPlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5"
        />
        <span>{label}</span>
      </label>
      {checked && onDetailChange && (
        <input
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder}
        />
      )}
    </div>
  );
}
