import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AnamnesisDetailView } from "@/components/AnamnesisDetail";

export default async function AnamneseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const anamnesis = await prisma.anamnesis.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!anamnesis) notFound();

  return (
    <AnamnesisDetailView
      anamnesis={{
        ...anamnesis,
        createdAt: anamnesis.createdAt.toISOString(),
        approvedAt: anamnesis.approvedAt?.toISOString() || null,
      }}
    />
  );
}
