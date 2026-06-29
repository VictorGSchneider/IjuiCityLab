# Impulsa Ijuí — App Astro (SSR)

Aplicação única em **Astro SSR** que serve **tudo**: o site público, o painel
ao vivo de projetos, o portal do participante, a área de administração e toda a
API (substitui o antigo backend Express). Em producao, a persistencia usa **Postgres/Neon** via `DATABASE_URL`; em desenvolvimento local, sem `DATABASE_URL`, o app usa SQLite como fallback.

## Requisitos

- **Node.js ≥ 22.5** (em Node 22/23 os scripts passam `--experimental-sqlite`
  automaticamente; em Node 24+ o módulo é estável e a flag é apenas um no-op).

## Rodar

```bash
cp .env.example .env          # edite JWT_SECRET, ADMIN_* etc.
npm install
npm run dev                   # desenvolvimento (http://localhost:3000)
```

Produção:

```bash
npm run build
# variáveis de runtime DEVEM ser passadas no ambiente (o build do Astro só lê
# o .env em tempo de build):
JWT_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... DATABASE_URL=postgres://... \
  node ./dist/server/entry.mjs
```

| Rota | Descrição |
|---|---|
| `/` | Site público + **painel ao vivo** (`#painel`) |
| `/portal` | Portal do participante (propostas, projetos, chaves de API) |
| `/admin` | Administração (projetos, propostas, contatos, participantes, equipe) |
| `/docs/api` | Documentação da API de dados abertos |
| `/api/health` | Health check |

O primeiro administrador é criado a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`
na primeira execução (se ainda não existir um usuário com aquele e-mail).

## Atualizar dependências

```bash
npm run upgrade
```

Roda `npm-check-updates` (via `npx`, sem dev dep), atualiza tudo no
`package.json` (inclusive majors), reinstala do zero, audita, builda e mostra o
`git diff -- package.json` para revisão. Confirme antes de commitar — majors
podem mudar APIs.

## Estrutura

```
src/
  content/      site-body.html (corpo do site), api-docs.html  → injetados via import ?raw
  layouts/      Layout.astro
  lib/          db.js, auth.js, apikey.js, validate.js, http.js, options.js
  pages/
    index.astro, portal/, admin/, docs/api.astro
    api/        rotas SSR (substituem o Express)
public/         styles.css, script.js, site-data.js, visualizer.{css,js}, portal.*, admin.*
data/           icl.sqlite (fallback local; ignorado pelo git)
```

## API

### Site (sem chave — é o próprio site mostrando o próprio estado)

| Método | Rota | Função |
|---|---|---|
| `POST` | `/api/contact` | Formulário de contato |
| `POST` | `/api/proposals` | Submissão pública/anônima de proposta |
| `GET`  | `/api/visualizer` | Dados agregados do painel ao vivo |
| `GET`  | `/api/options` | Valores válidos de área/perfil/estágio |

### Autenticação

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/admin-login`
→ retornam `{ token, user }` (JWT Bearer).

### Participante — `/api/me/*` (Bearer de `participant`)

Perfil (`GET`/`PATCH`), senha (`POST /password`), propostas
(`GET`/`POST`/`PATCH`/`DELETE`), projetos próprios (`GET /projects`) e chaves de
API (`GET`/`POST /keys`, `DELETE /keys/:id`).

### Administração — `/api/admin/*` (Bearer de `admin`)

`stats`, `contacts`, `proposals`, `participants`, **`projects`** (CRUD, publicar,
definir dono e posição no mapa) e `admins` (POST).

### API de Dados Abertos — `/api/v1/*` (header `X-API-Key`)

| Método | Rota | Escopo | Função |
|---|---|---|---|
| `GET`  | `/api/v1/projects` | `read` | Catálogo dos projetos publicados |
| `GET`  | `/api/v1/measurements` | `read` | Lê medições (`?project=&metric=&from=&to=&format=json\|csv`) |
| `POST` | `/api/v1/ingest` | `ingest` | Envia medições de um projeto (só o dono da chave) |

Documentação navegável em `/docs/api`.

## Modelo de dados

`users`, `contacts`, `proposals`, `projects`, `api_keys`, `measurements`
(definidos em `src/lib/db.js`, criados automaticamente). Chaves de API são
guardadas apenas como hash SHA-256; o segredo é exibido uma única vez.

## Deploy

### Vercel

O projeto esta preparado para Vercel com `@astrojs/vercel`. Em deploy
local normal ele continua usando `@astrojs/node`.

Pela interface da Vercel:

1. Importe o repositorio.
2. Configure **Root Directory** como `astro`.
3. Framework: Astro.
4. Build command: `npm run build`.
5. Configure as variaveis de ambiente abaixo em Production e Preview.

Pela CLI:

```bash
cd astro
npx vercel login
npx vercel
npx vercel --prod
```

Variaveis obrigatorias/recomendadas:

```bash
DATABASE_URL=postgres://usuario:senha@host/db?sslmode=require
JWT_SECRET=uma-string-longa-e-aleatoria
JWT_EXPIRES_IN=7d
ADMIN_NAME=Administrador Impulsa Ijui
ADMIN_EMAIL=admin@impulsaijui.com.br
ADMIN_PASSWORD=troque-esta-senha
PASSWORD_RESET_EXPIRES_MINUTES=30
PASSWORD_RESET_SHOW_LINK=false
PUBLIC_BASE_URL=https://seu-dominio.vercel.app
```

Banco persistente na Vercel: instale Neon/Postgres pelo Marketplace da Vercel ou crie um banco Postgres externo e configure `DATABASE_URL` em Production e Preview. O esquema (`users`, `proposals`, `projects` etc.) e o admin inicial sao criados automaticamente na primeira requisicao.

### Node tradicional

Com `DATABASE_URL`, qualquer host Node usa Postgres. Sem `DATABASE_URL`, o app usa SQLite local em `data/icl.sqlite`, recomendado apenas para desenvolvimento ou demo controlada.
