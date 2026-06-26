"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function WhatsAppAdminPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/whatsapp");
    const data = await res.json();
    setMessages(data.messages || []);
    setConversations(data.conversations || []);
  }

  useEffect(() => {
    load();
    fetch("/api/admin/whatsapp/status")
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    setLoading(false);
    setMessage("");
    load();
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-white">
        ← Admin
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">WhatsApp</h1>
      <p className="text-[var(--muted)] mb-6">
        {configured
          ? "API conectada e ativa"
          : "Modo mock — configure as variáveis WHATSAPP_* no .env"}
      </p>

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

      <div className="card overflow-hidden p-0">
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

      <div className="card mt-6">
        <h2 className="font-semibold mb-3">Configurar Webhook na Meta</h2>
        <ol className="text-sm text-[var(--muted)] space-y-2 list-decimal list-inside">
          <li>
            URL:{" "}
            <code className="text-[var(--primary)]">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/whatsapp`
                : "https://seu-dominio.vercel.app/api/whatsapp"}
            </code>
          </li>
          <li>Verify Token: valor de WHATSAPP_VERIFY_TOKEN no .env</li>
          <li>Assine os campos: messages, message_status</li>
        </ol>
      </div>
    </div>
  );
}
