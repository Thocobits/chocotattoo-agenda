interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

function getConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
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

export async function sendWhatsAppMessage(phone: string, message: string) {
  const config = getConfig();
  if (!config) {
    console.log("[WhatsApp Mock]", phone, message);
    return { success: true, mock: true, messages: [{ id: "mock" }] };
  }

  return apiRequest(config.phoneNumberId, config.token, config.apiVersion, {
    to: normalizePhone(phone),
    type: "text",
    text: { body: message },
  });
}

export async function sendWhatsAppButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
) {
  const config = getConfig();
  if (!config) {
    const menu = buttons.map((b, i) => `${i + 1}. ${b.title}`).join("\n");
    return sendWhatsAppMessage(phone, `${bodyText}\n\n${menu}`);
  }

  return apiRequest(config.phoneNumberId, config.token, config.apiVersion, {
    to: normalizePhone(phone),
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
}

export async function sendWhatsAppList(
  phone: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) {
  const config = getConfig();
  if (!config) {
    const items = sections.flatMap((s) =>
      s.rows.map((r, i) => `${i + 1}. ${r.title}`)
    );
    return sendWhatsAppMessage(phone, `${bodyText}\n\n${items.join("\n")}`);
  }

  return apiRequest(config.phoneNumberId, config.token, config.apiVersion, {
    to: normalizePhone(phone),
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
}

export async function markMessageAsRead(messageId: string) {
  const config = getConfig();
  if (!config || !messageId) return;

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
}

export function buildAppointmentReminderMessage(
  clientName: string,
  artistName: string,
  date: Date
) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `Olá ${clientName}! 🎨\n\nLembrete: você tem uma sessão de tatuagem agendada com ${artistName}.\n\n📅 ${formatted}\n\nResponda *CONFIRMAR* para confirmar presença ou *CANCELAR* para cancelar.`;
}

export function buildAnamnesisLinkMessage(clientName: string, link: string) {
  return `Olá ${clientName}! 🎨\n\nAntes da sua sessão, preencha a ficha de anamnese:\n\n${link}\n\nApós preencher, apresente o QR Code no estúdio.`;
}

export function buildBookingConfirmationMessage(
  clientName: string,
  artistName: string,
  date: Date
) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `Olá ${clientName}! ✅\n\nAgendamento confirmado!\n\n🎨 Tatuador: ${artistName}\n📅 Data: ${formatted}\n\nAguardamos você no estúdio!`;
}

export function buildWelcomeMessage(studioName: string) {
  return `Olá! Bem-vindo ao *${studioName}* 🎨\n\nComo posso ajudar?`;
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

*CUIDADOS PÓS-SESSÃO:*

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
