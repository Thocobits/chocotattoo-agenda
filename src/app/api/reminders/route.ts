import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendWhatsAppMessage,
  buildAppointmentReminderMessage,
} from "@/lib/whatsapp";

async function sendReminders() {
  const settings = await prisma.studioSettings.findUnique({
    where: { id: "default" },
  });
  const hoursBefore = settings?.reminderHoursBefore || 24;

  const now = new Date();
  const reminderWindow = new Date(
    now.getTime() + hoursBefore * 60 * 60 * 1000
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      reminderSent: false,
      startAt: {
        gte: now,
        lte: reminderWindow,
      },
    },
    include: { client: true, artist: true },
  });

  let sent = 0;

  for (const apt of appointments) {
    const message = buildAppointmentReminderMessage(
      apt.client.name,
      apt.artist.name,
      apt.startAt
    );

    await sendWhatsAppMessage(apt.client.phone, message);
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminderSent: true },
    });
    await prisma.whatsAppMessage.create({
      data: {
        phone: apt.client.phone,
        direction: "outbound",
        type: "reminder",
        content: message,
      },
    });
    sent++;
  }

  return { sent, total: appointments.length };
}

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret =
    process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await sendReminders();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await sendReminders();
  return NextResponse.json(result);
}
