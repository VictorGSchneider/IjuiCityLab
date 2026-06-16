#!/usr/bin/env bash
# Atualiza TUDO para a última versão (inclusive majors), reinstala do zero,
# audita, builda e mostra o diff do package.json para revisão antes do commit.
#
# Uso:  npm run upgrade
# Rode sempre que quiser deixar as dependências em dia. Como ele inclui
# majors, sempre confira o `git diff` e rode os testes antes de commitar.

set -euo pipefail

cd "$(dirname "$0")/.."

green() { printf "\033[32m▸ %s\033[0m\n" "$*"; }
yellow() { printf "\033[33m▸ %s\033[0m\n" "$*"; }
red() { printf "\033[31m▸ %s\033[0m\n" "$*"; }

green "Versões instaladas antes:"
node -e "
const pkg = require('./package.json');
for (const [n, v] of Object.entries({...pkg.dependencies, ...(pkg.devDependencies||{})})) {
  let actual = '?';
  try { actual = require(n + '/package.json').version; } catch {}
  console.log(\`  \${n.padEnd(28)} \${v.padEnd(12)} (\${actual} instalado)\`);
}
" || true

green "Verificando upgrades disponíveis (npm-check-updates)..."
npx --yes npm-check-updates@latest

read -r -p "Aplicar todas as atualizações? [y/N] " resp
if [[ ! "$resp" =~ ^[yY]$ ]]; then
  yellow "Cancelado."
  exit 0
fi

green "Aplicando atualizações no package.json..."
npx --yes npm-check-updates@latest -u

green "Reinstalando do zero (removendo node_modules e package-lock.json)..."
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund

green "Rodando npm audit..."
if npm audit; then
  green "Sem vulnerabilidades."
else
  yellow "Vulnerabilidades restantes — tentando audit fix (sem --force)..."
  npm audit fix || true
  yellow "Audit final:"
  npm audit || red "Ainda há vulnerabilidades. Considere overrides no package.json em vez de --force (que pode regredir majors)."
fi

green "Buildando para validar que nada quebrou..."
npm run build

green "Diff do package.json:"
if command -v git >/dev/null 2>&1; then
  git --no-pager diff -- package.json || true
else
  yellow "(git não encontrado — pule)"
fi

green "Pronto. Revise o diff, rode o servidor (npm run dev) para confirmar os fluxos, e só então commite."
