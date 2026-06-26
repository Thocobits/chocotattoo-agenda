"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface AnamnesisDetailProps {
  anamnesis: {
    id: string;
    token: string;
    status: string;
    client: { name: string; phone: string };
    createdAt: string;
    approvedAt: string | null;
    hasAllergies: boolean | null;
    allergiesDetail: string | null;
    hasDiabetes: boolean | null;
    hasHeartProblems: boolean | null;
    takesMedication: boolean | null;
    medicationDetail: string | null;
    hasSkinConditions: boolean | null;
    skinConditionsDetail: string | null;
    isPregnant: boolean | null;
    hadTattooBefore: boolean | null;
    additionalNotes: string | null;
  };
}

export function AnamnesisDetailView({ anamnesis }: AnamnesisDetailProps) {
  const [qrCode, setQrCode] = useState("");
  const [approving, setApproving] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const formUrl = `${baseUrl}/anamnese/form/${anamnesis.token}`;

  useEffect(() => {
    fetch(`/api/anamnese/${anamnesis.id}/qrcode`)
      .then((r) => r.json())
      .then((data) => setQrCode(data.qrCode));
  }, [anamnesis.id]);

  async function handleApprove() {
    setApproving(true);
    await fetch(`/api/anamnese/${anamnesis.id}/approve`, { method: "POST" });
    setApproving(false);
    window.location.reload();
  }

  const isPending = anamnesis.status === "PENDING";
  const isApproved = anamnesis.status === "APPROVED";
  const hasFormData = anamnesis.hasAllergies !== null;

  return (
    <div className="max-w-3xl">
      <Link href="/anamnese" className="text-sm text-[var(--muted)] hover:text-white">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">
        Anamnese - {anamnesis.client.name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">QR Code para Aprovação</h2>
          {qrCode ? (
            <div className="flex flex-col items-center">
              <Image
                src={qrCode}
                alt="QR Code"
                width={200}
                height={200}
                className="rounded-lg"
              />
              <p className="text-sm text-[var(--muted)] mt-3 text-center">
                Cliente apresenta este QR no estúdio
              </p>
            </div>
          ) : (
            <p className="text-[var(--muted)]">Gerando QR Code...</p>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold mb-2">Informações</h2>
          <div>
            <p className="text-sm text-[var(--muted)]">Cliente</p>
            <p>{anamnesis.client.name}</p>
            <p className="text-sm">{anamnesis.client.phone}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Status</p>
            <span
              className={`badge ${
                isApproved
                  ? "badge-success"
                  : isPending
                    ? "badge-warning"
                    : "badge-danger"
              }`}
            >
              {isApproved ? "Aprovada" : isPending ? "Pendente" : "Rejeitada"}
            </span>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Link do formulário</p>
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--primary)] break-all hover:underline"
            >
              {formUrl}
            </a>
          </div>
          {anamnesis.approvedAt && (
            <div>
              <p className="text-sm text-[var(--muted)]">Aprovada em</p>
              <p>{formatDateTime(anamnesis.approvedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {hasFormData && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Ficha Preenchida</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Alergias" value={anamnesis.hasAllergies} detail={anamnesis.allergiesDetail} />
            <Field label="Diabetes" value={anamnesis.hasDiabetes} />
            <Field label="Problemas cardíacos" value={anamnesis.hasHeartProblems} />
            <Field label="Medicação" value={anamnesis.takesMedication} detail={anamnesis.medicationDetail} />
            <Field label="Condições de pele" value={anamnesis.hasSkinConditions} detail={anamnesis.skinConditionsDetail} />
            <Field label="Gravidez" value={anamnesis.isPregnant} />
            <Field label="Já fez tatuagem" value={anamnesis.hadTattooBefore} />
          </div>
          {anamnesis.additionalNotes && (
            <div className="mt-4">
              <p className="text-sm text-[var(--muted)]">Observações</p>
              <p>{anamnesis.additionalNotes}</p>
            </div>
          )}
        </div>
      )}

      {hasFormData && isPending && (
        <button
          onClick={handleApprove}
          disabled={approving}
          className="btn-primary w-full"
        >
          {approving ? "Aprovando..." : "Aprovar Ficha (scan QR)"}
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  detail,
}: {
  label: string;
  value: boolean | null;
  detail?: string | null;
}) {
  if (value === null) return null;
  return (
    <div>
      <p className="text-[var(--muted)]">{label}</p>
      <p>{value ? "Sim" : "Não"}</p>
      {detail && <p className="text-xs mt-1">{detail}</p>}
    </div>
  );
}
