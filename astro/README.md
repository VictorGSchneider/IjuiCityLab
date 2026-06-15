# Ijuí City Lab — App Astro (SSR)

Aplicação única em **Astro SSR** que serve **tudo**: o site público, o painel
ao vivo de projetos, o portal do participante, a área de administração e toda a
API (substitui o antigo backend Express). Persistência em **SQLite**.

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
JWT_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... DB_FILE=./data/icl.sqlite \
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
data/           icl.sqlite (criado em runtime; ignorado pelo git)
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

Processo Node único + arquivo SQLite — roda em qualquer host (Render, Fly,
Railway, VPS). Em produção: `JWT_SECRET` forte, HTTPS no proxy, backup periódico
de `data/icl.sqlite`.
