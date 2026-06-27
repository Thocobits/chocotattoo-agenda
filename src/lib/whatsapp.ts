import { prisma } from "@/lib/prisma";

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v22.0",
  };
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

export function getWebhookUrl() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/whatsapp`;
}

async function logOutbound(phone: string, type: string, content: string) {
  try {
    await prisma.whatsAppMessage.create({
      data: {
        phone: normalizePhone(phone),
        direction: "outbound",
        type,
        content: content.slice(0, 4000),
      },
    });
  } catch (error) {
    console.error("[WhatsApp] Failed to log outbound message:", error);
  }
}

async function apiRequest(
  phoneNumberId: string,
  token: string,
  apiVersion: string,
  body: Record<string, unknown>
) {
  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...body,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  return response.json();
}

export async function checkWhatsAppConnection(): Promise<{
  ok: boolean;
  configured: boolean;
  phoneNumberId?: string;
  displayPhone?: string;
  verifiedName?: string;
  error?: string;
}> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, configured: false, error: "Token ou Phone Number ID ausente" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${config.token}` },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        configured: true,
        phoneNumberId: config.phoneNumberId,
        error: text.slice(0, 200),
      };
    }

    const data = await response.json();
    return {
      ok: true,
      configured: true,
      phoneNumberId: config.phoneNumberId,
      displayPhone: data.display_phone_number,
      verifiedName: data.verified_name,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      phoneNumberId: config.phoneNumberId,
      error: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  type = "general"
) {
  const config = getWhatsAppConfig();
  const normalized = normalizePhone(phone);

  if (!config) {
    console.log("[WhatsApp Mock]", normalized, message);
    await logOutbound(normalized, type, `[MOCK] ${message}`);
    return { success: true, mock: true, messages: [{ id: "mock" }] };
  }

  const result = await apiRequest(config.phoneNumberId, config.token, config.apiVersion, {
    to: normalized,
    type: "text",
    text: { body: message },
  });

  await logOutbound(normalized, type, message);
  return result;
}

export async function sendWhatsAppButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  type = "general"
) {
  const config = getWhatsAppConfig();
  const normalized = normalizePhone(phone);

  if (!config) {
    const menu = buttons.map((b, i) => `${i + 1}. ${b.title}`).join("\n");
    return sendWhatsAppMessage(normalized, `${bodyText}\n\n${menu}`, type);
  }

  const result = await apiRequest(config.phoneNumberId, config.token, config.apiVersion, {
    to: normalized,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });

  await logOutbound(normalized, type, `${bodyText} [botões: ${buttons.map((b) => b.title).join(", ")}]`);
  return result;
}

export async function sendWhatsAppList(
  phone: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>,
  type = "general"
) {
  const config = getWhatsAppConfig();
  const normalized = normalizePhone(phone);

  if (!config) {
    const items = sections.flatMap((s) =>
      s.rows.map((r, i) => `${i + 1}. ${r.title}`)
    );
    return sendWhatsAppMessage(normalized, `${bodyText}\n\n${items.join("\n")}`, type);
  }

  const result = await apiRequest(config.phoneNumberId, config.token, config.apiVersion, {
    to: normalized,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72),
          })),
        })),
      },
    },
  });

  const items = sections.flatMap((s) => s.rows.map((r) => r.title)).join(", ");
  await logOutbound(normalized, type, `${bodyText} [lista: ${items}]`);
  return result;
}

export async function markMessageAsRead(messageId: string) {
  const config = getWhatsAppConfig();
  if (!config || !messageId) return;

  try {
    await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      }
    );
  } catch (error) {
    console.error("[WhatsApp] markMessageAsRead failed:", error);
  }
}

export function buildAppointmentReminderMessage(
  clientName: string,
  professionalName: string,
  date: Date,
  serviceLabel = "sessão"
) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `Olá ${clientName}! 🎨\n\nLembrete: você tem uma ${serviceLabel} agendada com ${professionalName}.\n\n📅 ${formatted}\n\nResponda *CONFIRMAR* para confirmar presença ou *CANCELAR* para cancelar.`;
}

export function buildAnamnesisLinkMessage(clientName: string, link: string) {
  return `Olá ${clientName}! 🎨\n\nAntes da sua sessão, preencha a ficha de anamnese:\n\n${link}\n\nApós preencher, apresente o QR Code no estúdio.`;
}

export function buildBookingConfirmationMessage(
  clientName: string,
  professionalName: string,
  date: Date,
  extra = ""
) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `Olá ${clientName}! ✅\n\nAgendamento confirmado!\n\n👤 Profissional: ${professionalName}\n📅 Data: ${formatted}${extra}\n\nAguardamos você no estúdio!`;
}

export function buildWelcomeMessage(studioName: string) {
  return `Olá! Bem-vindo ao *${studioName}* 🎨\n\nEscolha uma opção no menu abaixo:`;
}

export function buildPostSessionCareMessage(
  clientName: string,
  artistName: string,
  studioName: string
) {
  const firstName = clientName.split(" ")[0];

  return `Olá ${firstName}! 🎨

Obrigado por tatuar com a *${studioName}*!

Esperamos que tenha tido uma ótima experiência com ${artistName}.

*CUIDADOS PÓS-TATUAGEM:*

1️⃣ Mantenha o filme por 2 a 4 horas, depois lave com sabonete neutro e água morna
2️⃣ Seque com toalha limpa, sem esfregar — apenas tampe
3️⃣ Aplique uma camada fina de pomada cicatrizante indicada pelo tatuador
4️⃣ Nos próximos dias, lave 2x ao dia e hidrate levemente
5️⃣ *Não* coce, não arranque casquinhas e não exponha ao sol
6️⃣ Evite piscina, mar, sauna e banho demorado por pelo menos 15 dias
7️⃣ Use protetor solar após a cicatrização (mín. 30 dias sem sol direto)

⚠️ Em caso de vermelhidão excessiva, pus ou febre, entre em contato conosco.

Cuide bem da sua arte — ela vai ficar incrível! 💚

_${studioName}_`;
}

export function buildPostPiercingCareMessage(
  clientName: string,
  piercerName: string,
  studioName: string,
  procedureName?: string
) {
  const firstName = clientName.split(" ")[0];
  const proc = procedureName ? `\n💎 Procedimento: ${procedureName}` : "";

  return `Olá ${firstName}! ✨

Obrigado por escolher a *${studioName}*!${proc}

Esperamos que tenha tido uma ótima experiência com ${piercerName}.

*CUIDADOS PÓS-PERFURAÇÃO:*

1️⃣ Lave com soro fisiológico 2x ao dia — sem girar a joia
2️⃣ Seque com gazes limpas ou secador frio
3️⃣ *Não* mexa, não troque a joia antes de 6–8 semanas
4️⃣ Evite piscina, mar, sauna e maquiagem na região
5️⃣ Durma do lado oposto se possível
6️⃣ Não use álcool, peróxido ou produtos agressivos

⚠️ Inchaço leve é normal nos primeiros dias. Procure o estúdio se houver pus, febre ou dor intensa.

Qualquer dúvida, estamos aqui! 💚

_${studioName}_`;
}
