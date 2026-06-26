# Família Chocotattoo — Agenda Studio

Sistema de gestão para estúdio de tatuagem e body pierce (web + PWA).

## Funcionalidades

- **PWA** — instale no celular como app
- **Agendamentos** — tatuagem e body pierce (perfuradores com procedimentos)
- **Comandas** — PIX, dinheiro, cartão; divisão automática de ganhos
- **Relatórios** — semanal e mensal por profissional
- **Anamnese** — ficha online + aprovação via QR Code
- **WhatsApp** — bot, confirmações, lembretes e pós-atendimento
- **Admin** — tatuadores, perfuradores, procedimentos, regiões, estilos

## Requisitos

- Node.js 18+
- PostgreSQL (Neon na nuvem ou Docker local)

## Instalação local

```bash
# 1. Banco PostgreSQL (Docker)
docker compose up -d

# 2. Dependências e .env
npm install
cp .env.example .env
# Edite .env se necessário

# 3. Banco e dados demo
npm run db:setup

# 4. Rodar
npm run dev
```

Acesse: http://localhost:3000

## Credenciais demo

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@studio.com | admin123 |
| Tatuador | joao@studio.com | tatuador123 |
| Body Pierce | ana@studio.com | pierce123 |

## Deploy (Vercel + Neon) — recomendado

Guia completo: **[DEPLOY.md](./DEPLOY.md)**

Resumo:

1. Repositório no GitHub
2. Banco [Neon](https://neon.tech) (região São Paulo)
3. Projeto na [Vercel](https://vercel.com) conectado ao GitHub
4. Integração Neon → Vercel (injeta `DATABASE_URL`)
5. Variáveis: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET`, WhatsApp, PIX
6. Após primeiro deploy: `npm run db:deploy` com `DATABASE_URL` de produção

## WhatsApp

Webhook na Meta:

- URL: `https://seu-app.vercel.app/api/whatsapp`
- Verify Token: valor de `WHATSAPP_VERIFY_TOKEN`
- Campos: `messages`, `message_status`

## Tecnologias

Next.js 15 · TypeScript · Tailwind · Prisma · PostgreSQL · NextAuth · PWA · WhatsApp Cloud API
