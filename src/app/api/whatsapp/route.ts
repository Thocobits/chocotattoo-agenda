import { NextRequest, NextResponse } from "next/server";
import { markMessageAsRead } from "@/lib/whatsapp";
import {
  processIncomingMessage,
  logWhatsAppMessage,
} from "@/lib/whatsapp-bot";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        const messages = value.messages || [];
        const statuses = value.statuses || [];

        for (const msg of messages) {
          const phone = msg.from as string;
          const text =
            (msg.text as { body?: string })?.body ||
            (msg.interactive as { button_reply?: { title: string } })
              ?.button_reply?.title ||
            "";

          await logWhatsAppMessage(
            phone,
            "inbound",
            "general",
            text,
            JSON.stringify(msg)
          );

          if (msg.id) {
            await markMessageAsRead(msg.id as string);
          }

          await processIncomingMessage(phone, msg as Record<string, unknown>);
        }

        for (const status of statuses) {
          if (status.status === "failed") {
            console.error("[WhatsApp] Message failed:", status);
          }
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
  }

  return NextResponse.json({ status: "ok" });
}
