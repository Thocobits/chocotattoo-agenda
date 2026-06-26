import { getSession } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, MapPin, Palette, MessageCircle, Gem } from "lucide-react";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) return null;

  const [artistCount, piercerCount, regionCount, styleCount, procedureCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "ARTIST", active: true } }),
      prisma.user.count({ where: { role: "PIERCER", active: true } }),
      prisma.bodyRegion.count({ where: { active: true } }),
      prisma.tattooStyle.count({ where: { active: true } }),
      prisma.piercingProcedure.count({ where: { active: true } }),
    ]);

  const cards = [
    {
      title: "Tatuadores",
      description: `${artistCount}/10 tatuadores ativos`,
      href: "/admin/tatuadores",
      icon: Users,
    },
    {
      title: "Body Pierce",
      description: `${piercerCount}/10 perfuradores ativos`,
      href: "/admin/perfuradores",
      icon: Gem,
    },
    {
      title: "Procedimentos",
      description: `${procedureCount} procedimentos de perfuração`,
      href: "/admin/procedimentos",
      icon: Gem,
    },
    {
      title: "Regiões do Corpo",
      description: `${regionCount} regiões cadastradas`,
      href: "/admin/regioes",
      icon: MapPin,
    },
    {
      title: "Estilos de Tatuagem",
      description: `${styleCount} estilos cadastrados`,
      href: "/admin/estilos",
      icon: Palette,
    },
    {
      title: "WhatsApp",
      description: "Mensagens e webhook",
      href: "/admin/whatsapp",
      icon: MessageCircle,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Administração</h1>
      <p className="text-[var(--muted)] mb-8">
        Gerencie tatuadores, perfuradores, valores e configurações do estúdio
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="card hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <Icon size={24} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{card.title}</h2>
                  <p className="text-sm text-[var(--muted)]">{card.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
