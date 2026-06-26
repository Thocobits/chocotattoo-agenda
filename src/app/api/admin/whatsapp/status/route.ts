import { NextResponse } from "next/server";
import { isWhatsAppConfigured } from "@/lib/whatsapp-config";

export async function GET() {
  return NextResponse.json({
    configured: isWhatsAppConfigured(),
  });
}
