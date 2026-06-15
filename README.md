# IjuiCityLab

Plataforma do **Ijuí City Lab** — laboratório urbano de inovação e sandbox
regulatório no bairro São Geraldo (Ijuí/RS).

Aplicação única em **Astro SSR + SQLite** (`astro/`) que reúne:

- **Site público** com **painel ao vivo** de projetos (mapa esquemático,
  indicadores e status, atualizando sozinho).
- **Portal do participante** — propostas, projetos e **chaves de API** para
  enviar dados das soluções automaticamente.
- **Administração** — projetos (CRUD/publicação/mapa), propostas, contatos,
  participantes e equipe.
- **API de dados abertos** (`/api/v1/*`, autenticada por chave) e documentação
  em `/docs/api`, para terceiros usarem a base em seus próprios projetos.

## Como rodar

```bash
cd astro
cp .env.example .env      # edite JWT_SECRET e credenciais do admin
npm install
npm run dev               # http://localhost:3000
```

Build de produção e detalhes de API/dados em [`astro/README.md`](astro/README.md).

## Arquitetura

Versão 2.0: tudo foi consolidado em Astro SSR (o backend Express anterior foi
aposentado). O Astro serve as páginas **e** toda a API a partir de um único
processo Node, com persistência em arquivo SQLite.
