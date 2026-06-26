import { prisma } from "@/lib/prisma";
import {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppList,
  buildWelcomeMessage,
  buildBookingConfirmationMessage,
  buildAnamnesisLinkMessage,
} from "@/lib/whatsapp";

type ConversationData = {
  name?: string;
  region?: string;
  preferredDate?: string;
  artistId?: string;
  artistName?: string;
};

const STEPS = {
  IDLE: "IDLE",
  AWAITING_NAME: "AWAITING_NAME",
  AWAITING_REGION: "AWAITING_REGION",
  AWAITING_DATE: "AWAITING_DATE",
  AWAITING_ARTIST: "AWAITING_ARTIST",
  AWAITING_CONFIRM: "AWAITING_CONFIRM",
} as const;

function parseData(json: string | null): ConversationData {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function formatPhoneBR(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

function extractText(
  msg: Record<string, unknown>
): { text: string; buttonId?: string } {
  const type = msg.type as string;

  if (type === "interactive") {
    const interactive = msg.interactive as Record<string, unknown>;
    if (interactive.type === "button_reply") {
      const reply = interactive.button_reply as { id: string; title: string };
      return { text: reply.title, buttonId: reply.id };
    }
    if (interactive.type === "list_reply") {
      const reply = interactive.list_reply as { id: string; title: string };
      return { text: reply.title, buttonId: reply.id };
    }
  }

  const text = (msg.text as { body?: string })?.body || "";
  return { text: text.trim() };
}

async function getOrCreateConversation(phone: string) {
  return prisma.whatsAppConversation.upsert({
    where: { phone },
    update: {},
    create: { phone, step: STEPS.IDLE },
  });
}

async function updateConversation(
  phone: string,
  step: string,
  data?: ConversationData
) {
  return prisma.whatsAppConversation.update({
    where: { phone },
    data: {
      step,
      data: data ? JSON.stringify(data) : undefined,
    },
  });
}

async function sendMainMenu(phone: string) {
  const settings = await prisma.studioSettings.findUnique({
    where: { id: "default" },
  });
  const studioName = settings?.studioName || "Agenda Studio";

  await sendWhatsAppButtons(
    phone,
    buildWelcomeMessage(studioName),
    [
      { id: "agendar", title: "Agendar tatuagem" },
      { id: "anamnese", title: "Ficha anamnese" },
      { id: "atendente", title: "Falar c/ estúdio" },
    ]
  );
}

async function handleIdle(phone: string, text: string, buttonId?: string) {
  const choice = buttonId || text.toLowerCase();

  if (
    choice === "agendar" ||
    choice.includes("agendar") ||
    choice === "1"
  ) {
    await updateConversation(phone, STEPS.AWAITING_NAME, {});
    await sendWhatsAppMessage(
      phone,
      "Ótimo! Vamos agendar sua tatuagem. 🎨\n\nQual é o seu *nome completo*?"
    );
    return;
  }

  if (
    choice === "anamnese" ||
    choice.includes("anamnese") ||
    choice.includes("ficha") ||
    choice === "2"
  ) {
    await handleAnamnesisRequest(phone);
    return;
  }

  if (
    choice === "atendente" ||
    choice.includes("atendente") ||
    choice.includes("falar") ||
    choice === "3"
  ) {
    await sendWhatsAppMessage(
      phone,
      "Um atendente do estúdio entrará em contato em breve. Enquanto isso, descreva sua dúvida aqui."
    );
    await updateConversation(phone, STEPS.IDLE);
    return;
  }

  if (text.toLowerCase() === "confirmar") {
    await handleConfirmAppointment(phone);
    return;
  }

  if (text.toLowerCase() === "cancelar") {
    await handleCancelAppointment(phone);
    return;
  }

  await sendMainMenu(phone);
}

async function handleAnamnesisRequest(phone: string) {
  const formattedPhone = formatPhoneBR(phone);
  let client = await prisma.client.findFirst({
    where: {
      OR: [{ phone: formattedPhone }, { phone }],
    },
  });

  if (!client) {
    await sendWhatsAppMessage(
      phone,
      "Não encontramos seu cadastro. Informe seu *nome completo* para criarmos sua ficha:"
    );
    await updateConversation(phone, STEPS.AWAITING_NAME, { region: "__anamnese__" });
    return;
  }

  const anamnesis = await prisma.anamnesis.create({
    data: { clientId: client.id },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/anamnese/form/${anamnesis.token}`;
  await sendWhatsAppMessage(
    phone,
    buildAnamnesisLinkMessage(client.name, link)
  );
  await updateConversation(phone, STEPS.IDLE);
}

async function handleConfirmAppointment(phone: string) {
  const formattedPhone = formatPhoneBR(phone);
  const client = await prisma.client.findFirst({
    where: { OR: [{ phone: formattedPhone }, { phone }] },
  });

  if (!client) {
    await sendWhatsAppMessage(phone, "Não encontramos agendamentos para este número.");
    return;
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      clientId: client.id,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    include: { artist: true },
  });

  if (!appointment) {
    await sendWhatsAppMessage(phone, "Você não possui agendamentos pendentes.");
    return;
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CONFIRMED" },
  });

  await sendWhatsAppMessage(
    phone,
    `Presença confirmada! ✅\n\nAguardamos você em ${new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(appointment.startAt)} com ${appointment.artist.name}.`
  );
}

async function handleCancelAppointment(phone: string) {
  const formattedPhone = formatPhoneBR(phone);
  const client = await prisma.client.findFirst({
    where: { OR: [{ phone: formattedPhone }, { phone }] },
  });

  if (!client) {
    await sendWhatsAppMessage(phone, "Não encontramos agendamentos para este número.");
    return;
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      clientId: client.id,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
  });

  if (!appointment) {
    await sendWhatsAppMessage(phone, "Você não possui agendamentos para cancelar.");
    return;
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  await sendWhatsAppMessage(
    phone,
    "Agendamento cancelado. Para reagendar, envie *agendar* ou use o menu."
  );
  await sendMainMenu(phone);
}

async function handleAwaitingName(
  phone: string,
  text: string,
  data: ConversationData
) {
  if (text.length < 2) {
    await sendWhatsAppMessage(phone, "Por favor, informe seu nome completo.");
    return;
  }

  if (data.region === "__anamnese__") {
    const formattedPhone = formatPhoneBR(phone);
    const client = await prisma.client.upsert({
      where: { phone: formattedPhone },
      update: { name: text },
      create: { name: text, phone: formattedPhone },
    });

    const anamnesis = await prisma.anamnesis.create({
      data: { clientId: client.id },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/anamnese/form/${anamnesis.token}`;
    await sendWhatsAppMessage(
      phone,
      buildAnamnesisLinkMessage(client.name, link)
    );
    await updateConversation(phone, STEPS.IDLE, {});
    return;
  }

  await updateConversation(phone, STEPS.AWAITING_REGION, {
    ...data,
    name: text,
  });
  await sendWhatsAppMessage(
    phone,
    `Prazer, ${text.split(" ")[0]}! 😊\n\nQual *região do corpo* você deseja tatuar?\n\nEx: braço, costas, perna...`
  );
}

async function handleAwaitingRegion(
  phone: string,
  text: string,
  data: ConversationData
) {
  await updateConversation(phone, STEPS.AWAITING_DATE, {
    ...data,
    region: text,
  });
  await sendWhatsAppMessage(
    phone,
    "Qual *data e horário* você prefere?\n\nEx: 15/07 às 14h"
  );
}

async function handleAwaitingDate(
  phone: string,
  text: string,
  data: ConversationData
) {
  const artists = await prisma.user.findMany({
    where: { role: "ARTIST", active: true },
    select: { id: true, name: true },
    take: 10,
  });

  if (artists.length === 0) {
    await sendWhatsAppMessage(
      phone,
      "No momento não há tatuadores disponíveis. Entre em contato com o estúdio."
    );
    await updateConversation(phone, STEPS.IDLE, {});
    return;
  }

  if (artists.length === 1) {
    await updateConversation(phone, STEPS.AWAITING_CONFIRM, {
      ...data,
      preferredDate: text,
      artistId: artists[0].id,
      artistName: artists[0].name,
    });
    await sendWhatsAppButtons(
      phone,
      `Resumo do agendamento:\n\n👤 ${data.name}\n📍 ${data.region}\n📅 ${text}\n🎨 ${artists[0].name}\n\nConfirma?`,
      [
        { id: "confirmar_agendamento", title: "Confirmar" },
        { id: "cancelar_agendamento", title: "Cancelar" },
      ]
    );
    return;
  }

  await updateConversation(phone, STEPS.AWAITING_ARTIST, {
    ...data,
    preferredDate: text,
  });

  await sendWhatsAppList(
    phone,
    "Escolha o tatuador:",
    "Ver tatuadores",
    [
      {
        title: "Tatuadores",
        rows: artists.map((a) => ({
          id: `artist_${a.id}`,
          title: a.name,
        })),
      },
    ]
  );
}

async function handleAwaitingArtist(
  phone: string,
  text: string,
  buttonId: string | undefined,
  data: ConversationData
) {
  const artistId = buttonId?.replace("artist_", "");
  if (!artistId) {
    await sendWhatsAppMessage(phone, "Selecione um tatuador da lista.");
    return;
  }

  const artist = await prisma.user.findUnique({ where: { id: artistId } });
  if (!artist) {
    await sendWhatsAppMessage(phone, "Tatuador não encontrado. Tente novamente.");
    return;
  }

  await updateConversation(phone, STEPS.AWAITING_CONFIRM, {
    ...data,
    artistId: artist.id,
    artistName: artist.name,
  });

  await sendWhatsAppButtons(
    phone,
    `Resumo do agendamento:\n\n👤 ${data.name}\n📍 ${data.region}\n📅 ${data.preferredDate}\n🎨 ${artist.name}\n\nConfirma?`,
    [
      { id: "confirmar_agendamento", title: "Confirmar" },
      { id: "cancelar_agendamento", title: "Cancelar" },
    ]
  );
}

async function handleAwaitingConfirm(
  phone: string,
  text: string,
  buttonId: string | undefined,
  data: ConversationData
) {
  const choice = buttonId || text.toLowerCase();

  if (choice === "cancelar_agendamento" || choice.includes("cancelar")) {
    await sendWhatsAppMessage(phone, "Agendamento cancelado. Envie *oi* para o menu.");
    await updateConversation(phone, STEPS.IDLE, {});
    return;
  }

  if (
    choice !== "confirmar_agendamento" &&
    !choice.includes("confirmar") &&
    choice !== "sim"
  ) {
    await sendWhatsAppMessage(phone, 'Responda *Confirmar* ou *Cancelar*.');
    return;
  }

  const formattedPhone = formatPhoneBR(phone);
  const client = await prisma.client.upsert({
    where: { phone: formattedPhone },
    update: { name: data.name || "Cliente" },
    create: { name: data.name || "Cliente", phone: formattedPhone },
  });

  const startAt = parsePreferredDate(data.preferredDate || "");
  const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

  const appointment = await prisma.appointment.create({
    data: {
      clientId: client.id,
      artistId: data.artistId!,
      startAt,
      endAt,
      status: "SCHEDULED",
      notes: `Região: ${data.region}. Agendado via WhatsApp.`,
    },
    include: { artist: true },
  });

  await sendWhatsAppMessage(
    phone,
    buildBookingConfirmationMessage(
      client.name,
      appointment.artist.name,
      appointment.startAt
    )
  );

  const anamnesis = await prisma.anamnesis.create({
    data: { clientId: client.id },
  });
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/anamnese/form/${anamnesis.token}`;
  await sendWhatsAppMessage(
    phone,
    `📋 Também enviamos o link da ficha de anamnese:\n${link}`
  );

  await updateConversation(phone, STEPS.IDLE, {});
  await sendWhatsAppMessage(
    phone,
    "Agendamento registrado! O estúdio pode entrar em contato para confirmar horário exato."
  );
}

function parsePreferredDate(text: string): Date {
  const match = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  const now = new Date();

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = match[3]
      ? parseInt(match[3].length === 2 ? `20${match[3]}` : match[3], 10)
      : now.getFullYear();

    const hourMatch = text.match(/(\d{1,2})\s*h/i);
    const hour = hourMatch ? parseInt(hourMatch[1], 10) : 14;

    const date = new Date(year, month, day, hour, 0, 0);
    if (date > now) return date;
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(14, 0, 0, 0);
  return fallback;
}

export async function processIncomingMessage(
  phone: string,
  msg: Record<string, unknown>
) {
  const { text, buttonId } = extractText(msg);
  const normalizedPhone = formatPhoneBR(phone);

  if (!text && !buttonId) return;

  const conversation = await getOrCreateConversation(normalizedPhone);
  const data = parseData(conversation.data);

  const lowerText = text.toLowerCase();
  if (
    conversation.step === STEPS.IDLE &&
    (lowerText === "oi" ||
      lowerText === "olá" ||
      lowerText === "ola" ||
      lowerText === "menu" ||
      lowerText === "inicio" ||
      lowerText === "início")
  ) {
    await sendMainMenu(normalizedPhone);
    return;
  }

  switch (conversation.step) {
    case STEPS.IDLE:
      await handleIdle(normalizedPhone, text, buttonId);
      break;
    case STEPS.AWAITING_NAME:
      await handleAwaitingName(normalizedPhone, text, data);
      break;
    case STEPS.AWAITING_REGION:
      await handleAwaitingRegion(normalizedPhone, text, data);
      break;
    case STEPS.AWAITING_DATE:
      await handleAwaitingDate(normalizedPhone, text, data);
      break;
    case STEPS.AWAITING_ARTIST:
      await handleAwaitingArtist(normalizedPhone, text, buttonId, data);
      break;
    case STEPS.AWAITING_CONFIRM:
      await handleAwaitingConfirm(normalizedPhone, text, buttonId, data);
      break;
    default:
      await sendMainMenu(normalizedPhone);
  }
}

export async function logWhatsAppMessage(
  phone: string,
  direction: "inbound" | "outbound",
  type: string,
  content: string,
  metadata?: string
) {
  await prisma.whatsAppMessage.create({
    data: { phone, direction, type, content, metadata },
  });
}
