import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) return null;
  return session;
}

function validatePassword(password: string) {
  if (!password || password.length < 6) {
    return "A senha deve ter no mínimo 6 caracteres";
  }
  return null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const artists = await prisma.user.findMany({
    where: { role: "ARTIST" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      commissionRate: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(artists);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const count = await prisma.user.count({ where: { role: "ARTIST" } });
  if (count >= 10) {
    return NextResponse.json(
      { error: "Limite de 10 tatuadores atingido" },
      { status: 400 }
    );
  }

  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
  }

  const passwordError = validatePassword(body.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const emailExists = await prisma.user.findUnique({
    where: { email: body.email.trim().toLowerCase() },
  });
  if (emailExists) {
    return NextResponse.json(
      { error: "Este email já está cadastrado" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(body.password, 10);

  const artist = await prisma.user.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
      password: hashed,
      role: "ARTIST",
      commissionRate: body.commissionRate ?? 50,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      commissionRate: true,
      active: true,
    },
  });

  const [regions, styles] = await Promise.all([
    prisma.bodyRegion.findMany({ where: { active: true } }),
    prisma.tattooStyle.findMany({ where: { active: true } }),
  ]);

  await prisma.artistBodyRegion.createMany({
    data: regions.map((r) => ({ artistId: artist.id, bodyRegionId: r.id })),
  });
  await prisma.artistTattooStyle.createMany({
    data: styles.map((s) => ({ artistId: artist.id, tattooStyleId: s.id })),
  });

  return NextResponse.json(artist, { status: 201 });
}
