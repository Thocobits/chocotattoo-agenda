import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@studio.com" },
    update: {},
    create: {
      email: "admin@studio.com",
      password: adminPassword,
      name: "Administrador",
      role: "ADMIN",
      commissionRate: 0,
    },
  });

  const artists = [
    { name: "João Silva", email: "joao@studio.com", commissionRate: 55 },
    { name: "Maria Santos", email: "maria@studio.com", commissionRate: 50 },
    { name: "Pedro Costa", email: "pedro@studio.com", commissionRate: 60 },
  ];

  const artistPassword = await bcrypt.hash("tatuador123", 10);

  for (const artist of artists) {
    await prisma.user.upsert({
      where: { email: artist.email },
      update: {},
      create: {
        ...artist,
        password: artistPassword,
        role: "ARTIST",
        phone: "5511999990000",
      },
    });
  }

  const regions = [
    { name: "Cabeça", basePrice: 400 },
    { name: "Pescoço", basePrice: 450 },
    { name: "Peito", basePrice: 600 },
    { name: "Costas", basePrice: 800 },
    { name: "Braço", basePrice: 300 },
    { name: "Antebraço", basePrice: 250 },
    { name: "Mão", basePrice: 200 },
    { name: "Barriga", basePrice: 500 },
    { name: "Flanco", basePrice: 450 },
    { name: "Glúteo", basePrice: 400 },
    { name: "Coxa", basePrice: 450 },
    { name: "Perna", basePrice: 400 },
    { name: "Panturrilha", basePrice: 350 },
    { name: "Tornozelo", basePrice: 200 },
    { name: "Pé", basePrice: 200 },
    { name: "Outro", basePrice: 0 },
  ];

  for (const region of regions) {
    await prisma.bodyRegion.upsert({
      where: { name: region.name },
      update: {},
      create: region,
    });
  }

  const styles = [
    { name: "Preto e Cinza", description: "Black and grey", priceMultiplier: 1.2 },
    { name: "Realismo", description: "Realismo fotográfico", priceMultiplier: 1.5 },
    { name: "Fine Line", description: "Traços finos e delicados", priceMultiplier: 1.2 },
    { name: "Blackwork", description: "Preto sólido e geométrico", priceMultiplier: 1.1 },
    { name: "Full Color", description: "Cores vivas e saturadas", priceMultiplier: 1.4 },
    { name: "Old School", description: "Tradicional americano", priceMultiplier: 1.0 },
    { name: "Neo Traditional", description: "Tradicional moderno", priceMultiplier: 1.2 },
    { name: "Aquarela", description: "Efeito watercolor", priceMultiplier: 1.3 },
    { name: "Lettering", description: "Letras e tipografia", priceMultiplier: 1.0 },
    { name: "Pontilhismo", description: "Dotwork", priceMultiplier: 1.15 },
  ];

  for (const style of styles) {
    await prisma.tattooStyle.upsert({
      where: { name: style.name },
      update: { description: style.description, priceMultiplier: style.priceMultiplier },
      create: style,
    });
  }

  const piercingProcedures = [
    { name: "Nariz", description: "Perfuração nasal geral", basePrice: 80 },
    { name: "Nostril", description: "Narina lateral", basePrice: 80 },
    { name: "Septum", description: "Septo nasal", basePrice: 100 },
    { name: "Tragus", description: "Tragus (orelha)", basePrice: 90 },
    { name: "Daith", description: "Daith (orelha interna)", basePrice: 100 },
    { name: "Conch", description: "Conch (concha da orelha)", basePrice: 90 },
    { name: "Hélix", description: "Hélix (orelha superior)", basePrice: 80 },
    { name: "Lóbulo", description: "Lóbulo da orelha", basePrice: 60 },
    { name: "Rook", description: "Rook (orelha)", basePrice: 100 },
    { name: "Industrial", description: "Industrial (dupla perfuração)", basePrice: 150 },
    { name: "Umbigo", description: "Perfuração umbilical", basePrice: 100 },
    { name: "Sobrancelha", description: "Sobrancelha", basePrice: 80 },
    { name: "Língua", description: "Língua", basePrice: 100 },
    { name: "Monroe", description: "Monroe (lábio superior)", basePrice: 80 },
    { name: "Labret", description: "Labret (lábio)", basePrice: 80 },
    { name: "Surface", description: "Surface piercing", basePrice: 120 },
    { name: "Microdermal", description: "Microdermal / dermal anchor", basePrice: 150 },
  ];

  for (const proc of piercingProcedures) {
    await prisma.piercingProcedure.upsert({
      where: { name: proc.name },
      update: { description: proc.description, basePrice: proc.basePrice },
      create: proc,
    });
  }

  const piercerPassword = await bcrypt.hash("pierce123", 10);

  const piercers = [
    { name: "Ana Pierce", email: "ana@studio.com", commissionRate: 50 },
    { name: "Lucas Body", email: "lucas@studio.com", commissionRate: 55 },
  ];

  for (const piercer of piercers) {
    await prisma.user.upsert({
      where: { email: piercer.email },
      update: {},
      create: {
        ...piercer,
        password: piercerPassword,
        role: "PIERCER",
        phone: "5511998880000",
      },
    });
  }

  await prisma.studioSettings.upsert({
    where: { id: "default" },
    update: {
      studioName: "Família Chocotattoo",
      pixKey: "5511982470182",
      pixMerchantName: "Familia Chocotattoo",
      pixMerchantCity: "SAO PAULO",
    },
    create: {
      id: "default",
      studioName: "Família Chocotattoo",
      defaultCommission: 50,
      reminderHoursBefore: 24,
      pixKey: "5511982470182",
      pixMerchantName: "Familia Chocotattoo",
      pixMerchantCity: "SAO PAULO",
    },
  });

  const allRegions = await prisma.bodyRegion.findMany({ where: { active: true } });
  const allStyles = await prisma.tattooStyle.findMany({ where: { active: true } });
  const allArtists = await prisma.user.findMany({ where: { role: "ARTIST" } });
  const allProcedures = await prisma.piercingProcedure.findMany({ where: { active: true } });
  const allPiercers = await prisma.user.findMany({ where: { role: "PIERCER" } });

  for (const artist of allArtists) {
    for (const region of allRegions) {
      await prisma.artistBodyRegion.upsert({
        where: {
          artistId_bodyRegionId: { artistId: artist.id, bodyRegionId: region.id },
        },
        update: {},
        create: { artistId: artist.id, bodyRegionId: region.id },
      });
    }
    for (const style of allStyles) {
      await prisma.artistTattooStyle.upsert({
        where: {
          artistId_tattooStyleId: { artistId: artist.id, tattooStyleId: style.id },
        },
        update: {},
        create: { artistId: artist.id, tattooStyleId: style.id },
      });
    }
  }

  for (const piercer of allPiercers) {
    for (const proc of allProcedures) {
      await prisma.piercerProcedure.upsert({
        where: {
          piercerId_piercingProcedureId: {
            piercerId: piercer.id,
            piercingProcedureId: proc.id,
          },
        },
        update: {},
        create: { piercerId: piercer.id, piercingProcedureId: proc.id },
      });
    }
  }

  const client = await prisma.client.upsert({
    where: { phone: "5511987654321" },
    update: {},
    create: {
      name: "Cliente Exemplo",
      phone: "5511987654321",
      email: "cliente@email.com",
    },
  });

  const joao = await prisma.user.findUnique({ where: { email: "joao@studio.com" } });
  const braco = await prisma.bodyRegion.findUnique({ where: { name: "Braço" } });
  const realismo = await prisma.tattooStyle.findUnique({ where: { name: "Realismo" } });

  if (joao && braco && realismo) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const end = new Date(tomorrow);
    end.setHours(16, 0, 0, 0);

    const existing = await prisma.appointment.findFirst({
      where: { clientId: client.id, artistId: joao.id },
    });

    if (!existing) {
      await prisma.appointment.create({
        data: {
          clientId: client.id,
          artistId: joao.id,
          bodyRegionId: braco.id,
          tattooStyleId: realismo.id,
          startAt: tomorrow,
          endAt: end,
          status: "CONFIRMED",
          notes: "Sessão de realismo no braço",
        },
      });
    }
  }

  const ana = await prisma.user.findUnique({ where: { email: "ana@studio.com" } });
  const tragus = await prisma.piercingProcedure.findUnique({ where: { name: "Tragus" } });

  if (ana && tragus) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    nextWeek.setHours(11, 0, 0, 0);

    const endPiercing = new Date(nextWeek);
    endPiercing.setHours(11, 30, 0, 0);

    const existingPiercing = await prisma.appointment.findFirst({
      where: { clientId: client.id, artistId: ana.id, serviceType: "PIERCING" },
    });

    if (!existingPiercing) {
      await prisma.appointment.create({
        data: {
          clientId: client.id,
          artistId: ana.id,
          serviceType: "PIERCING",
          piercingProcedureId: tragus.id,
          startAt: nextWeek,
          endAt: endPiercing,
          status: "CONFIRMED",
          notes: "Perfuração tragus com joia em titânio",
        },
      });
    }
  }

  console.log("Seed concluído!");
  console.log("Admin:", admin.email, "/ senha: admin123");
  console.log("Tatuadores: *@studio.com / senha: tatuador123");
  console.log("Perfuradores: ana@studio.com, lucas@studio.com / senha: pierce123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
