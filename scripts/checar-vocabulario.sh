#!/bin/sh
# Procura palavras que saíram do vocabulário (ADR-0014) nos textos do projeto.
# Uso, na raiz: sh scripts/checar-vocabulario.sh   (deve imprimir "Vocabulário limpo")
PADRAO='tutu|caramingu|verdinha|Moeda Verde|bolada|Verdal|Garrafa D|mistura'
achou=$(grep -rniE "$PADRAO" frontend/src frontend/index.html backend/src 2>/dev/null || true)
if [ -n "$achou" ]; then
  echo "Sobraram palavras antigas:"
  echo "$achou"
  exit 1
fi
moeda=$(grep -rnE '"[^"]*[Mm]oeda[^"]*"|>[^<{]*[Mm]oeda[^<{]*<' frontend/src frontend/index.html backend/src 2>/dev/null | grep -v -- '-moeda' || true)
if [ -n "$moeda" ]; then
  echo "A palavra moeda apareceu em texto visível:"
  echo "$moeda"
  exit 1
fi
echo "Vocabulário limpo."
