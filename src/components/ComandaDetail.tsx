"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHODS, PaymentMethodKey } from "@/lib/payments";
import Link from "next/link";
import { Copy, Check } from "lucide-react";

interface ComandaDetailProps {
  comanda: {
    id: string;
    number: number;
    status: string;
    totalValue: number;
    artistPercent: number;
    artistEarning: number;
    studioEarning: number;
    paymentMethod: string | null;
    description: string | null;
    bodyRegionCustom: string | null;
    serviceType?: string;
    piercingProcedure?: { name: string } | null;
    openedAt: string;
    closedAt: string | null;
    client: { name: string; phone: string };
    artist: { name: string };
    bodyRegion: { name: string } | null;
  };
}

export function ComandaDetail({ comanda }: ComandaDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("PIX");
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const isOpen = comanda.status === "OPEN";
  const isPiercing = comanda.serviceType === "PIERCING";
  const staffLabel = isPiercing ? "Perfurador" : "Tatuador";

  useEffect(() => {
    if (isOpen && paymentMethod === "PIX") {
      loadPixQr();
    } else {
      setPixQr(null);
      setPixPayload(null);
    }
  }, [isOpen, paymentMethod, comanda.id]);

  async function loadPixQr() {
    setLoadingPix(true);
    try {
      const res = await fetch(`/api/comandas/${comanda.id}/pix-qrcode`);
      const data = await res.json();
      if (res.ok) {
        setPixQr(data.qrCode);
        setPixPayload(data.payload);
        setPixKey(data.pixKey);
      }
    } finally {
      setLoadingPix(false);
    }
  }

  async function handleCopyPix() {
    if (!pixPayload) return;
    await navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleClose() {
    const methodLabel = PAYMENT_METHODS[paymentMethod].label;
    if (!confirm(`Fechar comanda com pagamento em ${methodLabel}?`)) return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/comandas/${comanda.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod, sendWhatsApp }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao fechar comanda");
      return;
    }

    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <Link href="/comandas" className="text-sm text-[var(--muted)] hover:text-white">
        ← Voltar
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">Comanda #{comanda.number}</h1>
        <span
          className={`badge ${isOpen ? "badge-warning" : "badge-success"}`}
        >
          {isOpen ? "Aberta" : "Fechada"}
        </span>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <div className="card space-y-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Cliente</p>
            <p className="font-medium">{comanda.client.name}</p>
            <p className="text-sm">{comanda.client.phone}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">{staffLabel}</p>
            <p className="font-medium">{comanda.artist.name}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">
              {isPiercing ? "Procedimento" : "Região"}
            </p>
            <p>
              {isPiercing
                ? comanda.piercingProcedure?.name || "—"
                : comanda.bodyRegion?.name || comanda.bodyRegionCustom || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Aberta em</p>
            <p>{formatDateTime(comanda.openedAt)}</p>
          </div>
        </div>

        {comanda.description && (
          <div>
            <p className="text-sm text-[var(--muted)]">Descrição</p>
            <p>{comanda.description}</p>
          </div>
        )}
      </div>

      <div className="card space-y-4 mb-4">
        <h2 className="text-lg font-semibold">Valores</h2>
        <div className="text-3xl font-bold text-[var(--primary)]">
          {formatCurrency(comanda.totalValue)}
        </div>

        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">
              {staffLabel} ({comanda.artistPercent}%)
            </span>
            <span className="font-medium text-green-400">
              {formatCurrency(
                isOpen
                  ? (comanda.totalValue * comanda.artistPercent) / 100
                  : comanda.artistEarning
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Studio</span>
            <span className="font-medium text-amber-400">
              {formatCurrency(
                isOpen
                  ? comanda.totalValue -
                      (comanda.totalValue * comanda.artistPercent) / 100
                  : comanda.studioEarning
              )}
            </span>
          </div>
        </div>

        {!isOpen && comanda.paymentMethod && (
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-[var(--muted)]">Forma de pagamento</p>
            <p className="font-medium mt-1">
              {PAYMENT_METHODS[comanda.paymentMethod as PaymentMethodKey]?.icon}{" "}
              {PAYMENT_METHODS[comanda.paymentMethod as PaymentMethodKey]?.label}
            </p>
          </div>
        )}

        {comanda.closedAt && (
          <p className="text-sm text-[var(--muted)]">
            Fechada em {formatDateTime(comanda.closedAt)}
          </p>
        )}
      </div>

      {isOpen && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Forma de Pagamento</h2>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PAYMENT_METHODS) as PaymentMethodKey[]).map((key) => {
              const method = PAYMENT_METHODS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={`p-3 rounded-lg text-left text-sm transition-colors ${
                    paymentMethod === key
                      ? "bg-[var(--primary)]/20 border-2 border-[var(--primary)]"
                      : "bg-white/5 border-2 border-transparent hover:border-white/10"
                  }`}
                >
                  <span className="text-lg mr-2">{method.icon}</span>
                  {method.label}
                </button>
              );
            })}
          </div>

          {paymentMethod === "PIX" && (
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-[var(--muted)] mb-3 text-center">
                Escaneie o QR Code PIX — Chave: {pixKey || "5511982470182"}
              </p>
              {loadingPix ? (
                <p className="text-center text-sm">Gerando QR Code...</p>
              ) : pixQr ? (
                <div className="flex flex-col items-center gap-3">
                  <Image
                    src={pixQr}
                    alt="QR Code PIX"
                    width={220}
                    height={220}
                    className="rounded-lg bg-white p-2"
                  />
                  <p className="text-xl font-bold text-[var(--primary)]">
                    {formatCurrency(comanda.totalValue)}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copiado!" : "Copiar código PIX"}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {paymentMethod === "CASH" && (
            <p className="text-sm text-[var(--muted)] bg-white/5 rounded-lg p-3">
              💵 Pagamento em dinheiro. Confirme o valor recebido antes de fechar.
            </p>
          )}

          {(paymentMethod === "DEBIT_CARD" || paymentMethod === "CREDIT_CARD") && (
            <p className="text-sm text-[var(--muted)] bg-white/5 rounded-lg p-3">
              💳 Pagamento com cartão de{" "}
              {paymentMethod === "DEBIT_CARD" ? "débito" : "crédito"}.
              Processe na maquininha antes de fechar.
            </p>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
            />
            Enviar agradecimento e cuidados pós-sessão via WhatsApp
          </label>

          <button
            onClick={handleClose}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? "Fechando..."
              : `Fechar Comanda — ${PAYMENT_METHODS[paymentMethod].label}`}
          </button>
        </div>
      )}
    </div>
  );
}
