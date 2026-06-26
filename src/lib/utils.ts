import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Role } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Não autorizado");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== Role.ADMIN) {
    throw new Error("Acesso restrito ao administrador");
  }
  return session;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function calculateEarnings(totalValue: number, artistPercent: number) {
  const artistEarning = (totalValue * artistPercent) / 100;
  const studioEarning = totalValue - artistEarning;
  return { artistEarning, studioEarning };
}

export function isStaffRole(role: Role) {
  return role === Role.ARTIST || role === Role.PIERCER;
}

export function getRoleLabel(role: Role) {
  const labels: Record<Role, string> = {
    ADMIN: "Administrador",
    ARTIST: "Tatuador",
    PIERCER: "Body Pierce",
  };
  return labels[role];
}

export function getServiceTypeLabel(type: string) {
  return type === "PIERCING" ? "Perfuração" : "Tatuagem";
}
