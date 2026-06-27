"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Copy, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  phone: string;
  direction: string;
  type: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  phone: string;
  step: string;
  updatedAt: string;
}

interface Status {
  configured: boolean;
  connected: boolean;
  phoneNumberId: string | null;
  displayPhone: string | null;
  verifiedName: string | null;
  webhookUrl: string;
  verifyTokenSet: boolean;
  error: string | null;
  missing: string[];
}

export default function WhatsAppAdminPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    const [dataRes, statusRes] = await Promise.all([
      fetch("/api/admin/whatsapp"),
      fetch("/api/admin/whatsapp/status"),
    ]);
    const data = await dataRes.json();
    setMessages(data.messages || []);
    setConversations(data.conversations || []);
    setStatus(await statusRes.json());
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setFeedback("Copiado!");
    setTimeout(() => setFeedback(""), 2000);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback("");
    const res = await fetch("/api/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setFeedback(data.error || "Erro ao enviar");
      return;
    }
    setMessage("");
    setFeedback("Mensagem enviada!");
    load();
  }

  async function handleTest() {
    if (!testPhone) return;
    setTestLoading(true);
    setFeedback("");
    const res = await fetch("/api/admin/whatsapp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone }),
    });
    const data = await res.json();
    setTestLoading(false);
    setFeedback(
      res.ok ? "Teste enviado! Verifique o WhatsApp." : data.error || "Falha no teste"
    );
    load();
  }

  const webhookUrl =
    status?.webhookUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp`
      : "https://chocotattoo-agenda.vercel.app/api/whatsapp");

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-white">
        ← Admin
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-[var(--muted)] text-sm">
            Integração Meta Cloud API
          </p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {feedback && (
        <div className="bg-blue-900/30 border border-blue-800 text-blue-200 px-4 py-3 rounded-lg text-sm mb-4">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            {status?.configured ? (
              <CheckCircle className="text-green-400" size={20} />
            ) : (
              <XCircle className="text-red-400" size={20} />
            )}
            <h2 className="font-semibold">API</h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {status?.configured
              ? status.connected
                ? `Conectado — ${status.verifiedName || status.displayPhone || "OK"}`
                : "Configurado mas com erro"
              : "Modo mock — faltam variáveis"}
          </p>
          {status?.missing && status.missing.length > 0 && (
            <p className="text-xs text-amber-400 mt-2">
              Falta: {status.missing.join(", ")}
            </p>
          )}
          {status?.error && (
            <p className="text-xs text-red-400 mt-2 break-all">{status.error}</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2">Webhook</h2>
          <p className="text-xs text-[var(--muted)] break-all">{webhookUrl}</p>
          <button
            type="button"
            onClick={() => copyText(webhookUrl)}
            className="text-xs text-[var(--primary)] mt-2 flex items-center gap-1"
          >
            <Copy size={12} /> Copiar URL
          </button>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2">Verify Token</h2>
          <p className="text-sm font-mono">agenda-studio-verify</p>
          <button
            type="button"
            onClick={() => copyText("agenda-studio-verify")}
            className="text-xs text-[var(--primary)] mt-2 flex items-center gap-1"
          >
            <Copy size={12} /> Copiar token
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Testar conexão</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Envie uma mensagem de teste para seu número (com DDI 55).
        </p>
        <div className="flex gap-2">
          <input
            placeholder="5511999999999"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testLoading || !testPhone}
            className="btn-primary"
          >
            {testLoading ? "Enviando..." : "Testar API"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <form onSubmit={handleSend} className="card space-y-4">
          <h2 className="font-semibold">Enviar mensagem manual</h2>
          <input
            placeholder="Telefone (5511999999999)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <textarea
            placeholder="Mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>

        <div className="card">
          <h2 className="font-semibold mb-4">Conversas ativas</h2>
          {conversations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nenhuma conversa</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-white/5 rounded-lg text-sm flex justify-between"
                >
                  <span>{c.phone}</span>
                  <span className="badge badge-info">{c.step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0 mb-6">
        <div className="p-4 border-b border-[var(--card-border)]">
          <h2 className="font-semibold">Histórico de mensagens</h2>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-[var(--card-border)]">
          {messages.map((m) => (
            <div key={m.id} className="p-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{m.phone}</span>
                <span className="text-[var(--muted)]">
                  {new Date(m.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <span
                className={`badge mr-2 ${
                  m.direction === "inbound" ? "badge-info" : "badge-success"
                }`}
              >
                {m.direction === "inbound" ? "Recebida" : "Enviada"}
              </span>
              <span className="badge badge-warning">{m.type}</span>
              <p className="mt-2 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="p-8 text-center text-[var(--muted)]">
              Nenhuma mensagem ainda
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Checklist Meta</h2>
        <ol className="text-sm text-[var(--muted)] space-y-2 list-decimal list-inside">
          <li>Webhook URL copiada acima → Meta → Etapa 2 → Verificar e salvar</li>
          <li>Verify token: <code className="text-[var(--primary)]">agenda-studio-verify</code></li>
          <li>Assinar campos: <code>messages</code> e <code>message_status</code></li>
          <li>Vercel: <code>WHATSAPP_TOKEN</code> + <code>WHATSAPP_PHONE_NUMBER_ID</code></li>
          <li>Adicionar seu número em números de teste na Meta</li>
          <li>Enviar <strong>oi</strong> para testar o bot</li>
        </ol>
      </div>
    </div>
  );
}
