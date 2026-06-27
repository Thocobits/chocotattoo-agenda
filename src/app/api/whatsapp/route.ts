import { NextRequest, NextResponse } from "next/server";
import { markMessageAsRead } from "@/lib/whatsapp";
import {
  processIncomingMessage,
  logWhatsAppMessage,
} from "@/lib/whatsapp-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "agenda-studio-verify";

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: { entry?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] }).changes || [];

      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> }).value;
        if (!value) continue;

        const messages = (value.messages || []) as Record<string, unknown>[];
        const statuses = (value.statuses || []) as Record<string, unknown>[];

        for (const msg of messages) {
          const phone = msg.from as string;
          const text =
            (msg.text as { body?: string })?.body ||
            (msg.interactive as { button_reply?: { title: string } })
              ?.button_reply?.title ||
            (msg.interactive as { list_reply?: { title: string } })
              ?.list_reply?.title ||
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

          await processIncomingMessage(phone, msg);
        }

        for (const status of statuses) {
          if (status.status === "failed") {
            console.error("[WhatsApp] Message failed:", status);
            const recipient = status.recipient_id as string | undefined;
            const errors = status.errors as unknown[] | undefined;
            if (recipient) {
              await logWhatsAppMessage(
                recipient,
                "outbound",
                "status_failed",
                JSON.stringify(errors || status)
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
  }

  return NextResponse.json({ status: "ok" });
}
