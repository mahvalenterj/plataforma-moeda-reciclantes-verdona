#!/bin/sh
# Rode uma vez, na raiz do projeto, depois de "git init" (ou de clonar o repositório).

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Esta pasta ainda não é um repositório git."
  echo "Rode primeiro:  git init"
  echo "Depois rode este script de novo:  sh scripts/instalar-hooks.sh"
  exit 1
fi

git config core.hooksPath scripts/hooks || exit 1
chmod +x scripts/hooks/pre-commit 2>/dev/null

if [ "$(git config core.hooksPath)" = "scripts/hooks" ]; then
  echo "Hook de pre-commit instalado."
else
  echo "Não consegui instalar o hook. Rode:  git config core.hooksPath scripts/hooks"
  exit 1
fi
