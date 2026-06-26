import { createStaticPix, hasError } from "pix-utils";
import QRCode from "qrcode";
import { prisma } from "./prisma";

async function getPixSettings() {
  const settings = await prisma.studioSettings.findUnique({
    where: { id: "default" },
  });

  return {
    pixKey: process.env.PIX_KEY || settings?.pixKey || "5511982470182",
    merchantName:
      process.env.PIX_MERCHANT_NAME ||
      settings?.pixMerchantName ||
      "Familia Chocotattoo",
    merchantCity:
      process.env.PIX_MERCHANT_CITY || settings?.pixMerchantCity || "SAO PAULO",
  };
}

function formatPixKey(key: string) {
  const digits = key.replace(/\D/g, "");
  if (digits.length === 11) return `+55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  return key;
}

export async function generatePixPayload(
  amount: number,
  description?: string
) {
  const { pixKey, merchantName, merchantCity } = await getPixSettings();

  const pix = createStaticPix({
    merchantName: merchantName.slice(0, 25),
    merchantCity: merchantCity.slice(0, 15),
    pixKey: formatPixKey(pixKey),
    transactionAmount: amount,
    infoAdicional: description?.slice(0, 72),
  });

  if (hasError(pix)) {
    throw new Error("Erro ao gerar código PIX");
  }

  return pix.toBRCode();
}

export async function generatePixQrCode(
  amount: number,
  description?: string
) {
  const payload = await generatePixPayload(amount, description);
  const qrCodeDataUrl = await QRCode.toDataURL(payload, {
    width: 280,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return { payload, qrCodeDataUrl };
}
