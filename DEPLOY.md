# Deploy — Vercel + Neon (GitHub)

## Pré-requisitos

- Conta [GitHub](https://github.com)
- Conta [Neon](https://neon.tech) (vinculada ao GitHub)
- Conta [Vercel](https://vercel.com) (login com GitHub)

---

## Passo 1 — Enviar código ao GitHub

No PC, na pasta do projeto:

```powershell
git init
git add .
git commit -m "Deploy: Família Chocotattoo agenda studio"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

> Crie o repositório vazio no GitHub antes do `git push`.

---

## Passo 2 — Neon (banco PostgreSQL)

1. Acesse [console.neon.tech](https://console.neon.tech)
2. **New Project** → nome: `chocotattoo` → região **AWS São Paulo** (`sa-east-1`)
3. Copie a **Connection string** (modo *Pooled* para Vercel):
   ```
   postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Integração Neon ↔ Vercel (recomendado)

No painel Neon: **Integrations → Vercel → Connect**  
Isso injeta `DATABASE_URL` automaticamente no projeto Vercel.

---

## Passo 3 — Vercel (app online)

1. [vercel.com/new](https://vercel.com/new) → **Import** do repositório GitHub
2. **Framework:** Next.js (detectado automaticamente)
3. **Root Directory:** `.` (raiz)
4. **Environment Variables** (Settings → Environment Variables):

| Variável | Valor | Ambiente |
|----------|-------|----------|
| `DATABASE_URL` | *(Neon integration ou colar URL)* | Production, Preview, Development |
| `NEXTAUTH_SECRET` | string aleatória longa (ex: `openssl rand -base64 32`) | All |
| `NEXTAUTH_URL` | `https://seu-app.vercel.app` | Production |
| `CRON_SECRET` | outra string secreta | Production |
| `WHATSAPP_VERIFY_TOKEN` | `agenda-studio-verify` | All |
| `WHATSAPP_TOKEN` | token Meta | Production |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número | Production |
| `PIX_KEY` | `5511982470182` | All |
| `PIX_MERCHANT_NAME` | `Familia Chocotattoo` | All |
| `PIX_MERCHANT_CITY` | `SAO PAULO` | All |

5. Clique **Deploy**

O build executa:
```
prisma generate → prisma db push → next build
```

---

## Passo 4 — Seed (dados iniciais, uma vez)

Após o primeiro deploy bem-sucedido, rode no seu PC:

```powershell
cd "caminho\agenda Studio"
$env:DATABASE_URL="postgresql://...sua-url-neon..."
npm run db:deploy
```

Isso cria admin, tatuadores, perfuradores, procedimentos e dados demo.

**Troque as senhas demo em produção!**

---

## Passo 5 — WhatsApp webhook

Meta Developers → WhatsApp → Configuration:

- **Callback URL:** `https://seu-app.vercel.app/api/whatsapp`
- **Verify token:** `agenda-studio-verify`
- **Fields:** `messages`, `message_status`

---

## Passo 6 — PWA no celular

Abra `https://seu-app.vercel.app` no Chrome → **Adicionar à tela inicial**.

---

## Deploys automáticos

Cada `git push` na branch `main` dispara novo deploy na Vercel.

---

## Lembretes automáticos

Configurado em `vercel.json` — cron às 12h e 18h UTC (9h e 15h horário de Brasília).

---

## Problemas comuns

| Erro | Solução |
|------|---------|
| Build falha no Prisma | Confirme `DATABASE_URL` na Vercel |
| Login não funciona | `NEXTAUTH_URL` deve ser a URL exata com `https://` |
| WhatsApp não responde | Webhook URL + token; `WHATSAPP_TOKEN` preenchido |
| Página em branco após deploy | Veja logs em Vercel → Deployments → Build Logs |

---

## Rodar em outro PC (desenvolvimento)

```powershell
git clone https://github.com/SEU-USUARIO/SEU-REPO.git
cd SEU-REPO
npm install
cp .env.example .env
docker compose up -d
npm run db:setup
npm run dev
```
