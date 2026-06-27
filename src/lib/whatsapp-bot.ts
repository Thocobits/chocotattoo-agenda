import { prisma } from "@/lib/prisma";
import {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppList,
  buildWelcomeMessage,
  buildBookingConfirmationMessage,
  buildAnamnesisLinkMessage,
  normalizePhone,
} from "@/lib/whatsapp";

type ServiceType = "TATTOO" | "PIERCING";

type ConversationData = {
  serviceType?: ServiceType;
  name?: string;
  region?: string;
  procedureId?: string;
  procedureName?: string;
  preferredDate?: string;
  artistId?: string;
  artistName?: string;
};

const STEPS = {
  IDLE: "IDLE",
  AWAITING_NAME: "AWAITING_NAME",
  AWAITING_REGION: "AWAITING_REGION",
  AWAITING_PROCEDURE: "AWAITING_PROCEDURE",
  AWAITING_DATE: "AWAITING_DATE",
  AWAITING_ARTIST: "AWAITING_ARTIST",
  AWAITING_PIERCER: "AWAITING_PIERCER",
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
  const studioName = settings?.studioName || "Família Chocotattoo";

  await sendWhatsAppList(
    phone,
    buildWelcomeMessage(studioName),
    "Ver opções",
    [
      {
        title: "Serviços",
        rows: [
          { id: "agendar_tattoo", title: "Agendar tatuagem", description: "Nova tatuagem" },
          { id: "agendar_piercing", title: "Body pierce", description: "Perfuração" },
          { id: "anamnese", title: "Ficha anamnese", description: "Preencher online" },
          { id: "atendente", title: "Falar c/ estúdio", description: "Atendimento humano" },
        ],
      },
    ],
    "menu"
  );
}

async function handleIdle(phone: string, text: string, buttonId?: string) {
  const choice = buttonId || text.toLowerCase();

  if (
    choice === "agendar_tattoo" ||
    choice === "agendar" ||
    choice.includes("tatuagem") ||
    choice === "1"
  ) {
    await updateConversation(phone, STEPS.AWAITING_NAME, { serviceType: "TATTOO" });
    await sendWhatsAppMessage(
      phone,
      "Ótimo! Vamos agendar sua tatuagem. 🎨\n\nQual é o seu *nome completo*?",
      "booking"
    );
    return;
  }

  if (
    choice === "agendar_piercing" ||
    choice.includes("pierce") ||
    choice.includes("perfura")
  ) {
    await updateConversation(phone, STEPS.AWAITING_NAME, { serviceType: "PIERCING" });
    await sendWhatsAppMessage(
      phone,
      "Ótimo! Vamos agendar sua perfuração. ✨\n\nQual é o seu *nome completo*?",
      "booking"
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
      "Um atendente do estúdio entrará em contato em breve. Enquanto isso, descreva sua dúvida aqui.",
      "general"
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
  const formattedPhone = normalizePhone(phone);
  let client = await prisma.client.findFirst({
    where: { OR: [{ phone: formattedPhone }, { phone }] },
  });

  if (!client) {
    await sendWhatsAppMessage(
      phone,
      "Não encontramos seu cadastro. Informe seu *nome completo* para criarmos sua ficha:",
      "anamnesis"
    );
    await updateConversation(phone, STEPS.AWAITING_NAME, {
      region: "__anamnese__",
    });
    return;
  }

  const anamnesis = await prisma.anamnesis.create({
    data: { clientId: client.id },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/anamnese/form/${anamnesis.token}`;
  await sendWhatsAppMessage(
    phone,
    buildAnamnesisLinkMessage(client.name, link),
    "anamnesis"
  );
  await updateConversation(phone, STEPS.IDLE);
}

async function handleConfirmAppointment(phone: string) {
  const formattedPhone = normalizePhone(phone);
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
    }).format(appointment.startAt)} com ${appointment.artist.name}.`,
    "booking"
  );
}

async function handleCancelAppointment(phone: string) {
  const formattedPhone = normalizePhone(phone);
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
    "Agendamento cancelado. Para reagendar, envie *oi* para o menu.",
    "booking"
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
    const formattedPhone = normalizePhone(phone);
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
      buildAnamnesisLinkMessage(client.name, link),
      "anamnesis"
    );
    await updateConversation(phone, STEPS.IDLE, {});
    return;
  }

  if (data.serviceType === "PIERCING") {
    const procedures = await prisma.piercingProcedure.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      take: 10,
    });

    if (procedures.length === 0) {
      await sendWhatsAppMessage(
        phone,
        "No momento não há procedimentos disponíveis. Entre em contato com o estúdio."
      );
      await updateConversation(phone, STEPS.IDLE, {});
      return;
    }

    await updateConversation(phone, STEPS.AWAITING_PROCEDURE, {
      ...data,
      name: text,
    });

    await sendWhatsAppList(
      phone,
      `Prazer, ${text.split(" ")[0]}! ✨\n\nQual *procedimento* você deseja?`,
      "Ver procedimentos",
      [
        {
          title: "Body Pierce",
          rows: procedures.map((p) => ({
            id: `proc_${p.id}`,
            title: p.name,
            description: p.basePrice > 0 ? `A partir de R$ ${p.basePrice}` : undefined,
          })),
        },
      ],
      "booking"
    );
    return;
  }

  await updateConversation(phone, STEPS.AWAITING_REGION, {
    ...data,
    name: text,
  });
  await sendWhatsAppMessage(
    phone,
    `Prazer, ${text.split(" ")[0]}! 😊\n\nQual *região do corpo* você deseja tatuar?\n\nEx: braço, costas, perna...`,
    "booking"
  );
}

async function handleAwaitingProcedure(
  phone: string,
  buttonId: string | undefined,
  data: ConversationData
) {
  const procedureId = buttonId?.replace("proc_", "");
  if (!procedureId) {
    await sendWhatsAppMessage(phone, "Selecione um procedimento da lista.");
    return;
  }

  const procedure = await prisma.piercingProcedure.findUnique({
    where: { id: procedureId },
  });
  if (!procedure) {
    await sendWhatsAppMessage(phone, "Procedimento não encontrado. Tente novamente.");
    return;
  }

  await updateConversation(phone, STEPS.AWAITING_DATE, {
    ...data,
    procedureId: procedure.id,
    procedureName: procedure.name,
  });
  await sendWhatsAppMessage(
    phone,
    `Procedimento: *${procedure.name}* ✨\n\nQual *data e horário* você prefere?\n\nEx: 15/07 às 14h`,
    "booking"
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
    "Qual *data e horário* você prefere?\n\nEx: 15/07 às 14h",
    "booking"
  );
}

async function handleAwaitingDate(
  phone: string,
  text: string,
  data: ConversationData
) {
  const isPiercing = data.serviceType === "PIERCING";
  const role = isPiercing ? "PIERCER" : "ARTIST";
  const label = isPiercing ? "perfurador" : "tatuador";

  const professionals = await prisma.user.findMany({
    where: { role, active: true },
    select: { id: true, name: true },
    take: 10,
  });

  if (professionals.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `No momento não há ${label}es disponíveis. Entre em contato com o estúdio.`
    );
    await updateConversation(phone, STEPS.IDLE, {});
    return;
  }

  const nextStep = isPiercing ? STEPS.AWAITING_PIERCER : STEPS.AWAITING_ARTIST;

  if (professionals.length === 1) {
    const pro = professionals[0];
    await updateConversation(phone, STEPS.AWAITING_CONFIRM, {
      ...data,
      preferredDate: text,
      artistId: pro.id,
      artistName: pro.name,
    });
    await sendConfirmSummary(phone, { ...data, preferredDate: text, artistName: pro.name });
    return;
  }

  await updateConversation(phone, nextStep, {
    ...data,
    preferredDate: text,
  });

  await sendWhatsAppList(
    phone,
    `Escolha o ${label}:`,
    `Ver ${label}es`,
    [
      {
        title: isPiercing ? "Perfuradores" : "Tatuadores",
        rows: professionals.map((p) => ({
          id: `artist_${p.id}`,
          title: p.name,
        })),
      },
    ],
    "booking"
  );
}

function buildSummary(data: ConversationData) {
  const lines = [`👤 ${data.name}`];
  if (data.serviceType === "PIERCING") {
    lines.push(`💎 ${data.procedureName}`);
  } else {
    lines.push(`📍 ${data.region}`);
  }
  lines.push(`📅 ${data.preferredDate}`);
  lines.push(`🎨 ${data.artistName}`);
  return lines.join("\n");
}

async function sendConfirmSummary(phone: string, data: ConversationData) {
  await sendWhatsAppButtons(
    phone,
    `Resumo do agendamento:\n\n${buildSummary(data)}\n\nConfirma?`,
    [
      { id: "confirmar_agendamento", title: "Confirmar" },
      { id: "cancelar_agendamento", title: "Cancelar" },
    ],
    "booking"
  );
}

async function handleAwaitingProfessional(
  phone: string,
  buttonId: string | undefined,
  data: ConversationData
) {
  const professionalId = buttonId?.replace("artist_", "");
  if (!professionalId) {
    await sendWhatsAppMessage(phone, "Selecione um profissional da lista.");
    return;
  }

  const professional = await prisma.user.findUnique({ where: { id: professionalId } });
  if (!professional) {
    await sendWhatsAppMessage(phone, "Profissional não encontrado. Tente novamente.");
    return;
  }

  const updated = {
    ...data,
    artistId: professional.id,
    artistName: professional.name,
  };

  await updateConversation(phone, STEPS.AWAITING_CONFIRM, updated);
  await sendConfirmSummary(phone, updated);
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
    await sendWhatsAppMessage(phone, "Responda *Confirmar* ou *Cancelar*.");
    return;
  }

  const formattedPhone = normalizePhone(phone);
  const client = await prisma.client.upsert({
    where: { phone: formattedPhone },
    update: { name: data.name || "Cliente" },
    create: { name: data.name || "Cliente", phone: formattedPhone },
  });

  const startAt = parsePreferredDate(data.preferredDate || "");
  const endAt = new Date(startAt.getTime() + (data.serviceType === "PIERCING" ? 30 : 120) * 60 * 1000);

  const isPiercing = data.serviceType === "PIERCING";
  const extra = isPiercing
    ? `\n💎 Procedimento: ${data.procedureName}`
    : `\n📍 Região: ${data.region}`;

  const appointment = await prisma.appointment.create({
    data: {
      clientId: client.id,
      artistId: data.artistId!,
      serviceType: isPiercing ? "PIERCING" : "TATTOO",
      piercingProcedureId: isPiercing ? data.procedureId : null,
      bodyRegionCustom: !isPiercing ? data.region : null,
      startAt,
      endAt,
      status: "SCHEDULED",
      notes: isPiercing
        ? `Procedimento: ${data.procedureName}. Agendado via WhatsApp.`
        : `Região: ${data.region}. Agendado via WhatsApp.`,
    },
    include: { artist: true, piercingProcedure: true },
  });

  await sendWhatsAppMessage(
    phone,
    buildBookingConfirmationMessage(
      client.name,
      appointment.artist.name,
      appointment.startAt,
      extra
    ),
    "booking"
  );

  const anamnesis = await prisma.anamnesis.create({
    data: { clientId: client.id },
  });
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/anamnese/form/${anamnesis.token}`;
  await sendWhatsAppMessage(
    phone,
    `📋 Também enviamos o link da ficha de anamnese:\n${link}`,
    "anamnesis"
  );

  await updateConversation(phone, STEPS.IDLE, {});
  await sendWhatsAppMessage(
    phone,
    "Agendamento registrado! O estúdio entrará em contato para confirmar o horário exato.",
    "booking"
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
  const normalizedPhone = normalizePhone(phone);

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
      lowerText === "início" ||
      lowerText === "ajuda")
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
    case STEPS.AWAITING_PROCEDURE:
      await handleAwaitingProcedure(normalizedPhone, buttonId, data);
      break;
    case STEPS.AWAITING_DATE:
      await handleAwaitingDate(normalizedPhone, text, data);
      break;
    case STEPS.AWAITING_ARTIST:
    case STEPS.AWAITING_PIERCER:
      await handleAwaitingProfessional(normalizedPhone, buttonId, data);
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
    data: {
      phone: normalizePhone(phone),
      direction,
      type,
      content: content.slice(0, 4000),
      metadata,
    },
  });
}
