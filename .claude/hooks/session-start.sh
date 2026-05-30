#!/bin/bash
# Hook de inicio de sesión: deja el proyecto listo (dependencias instaladas)
# para poder ejecutar lint / type-check / build en cada sesión web.
# Es idempotente y no interactivo.
set -euo pipefail

# Solo es necesario en el entorno remoto (Claude Code en la web).
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Instala dependencias de npm. Usamos `npm install` (no `ci`) para aprovechar
# la caché del contenedor en sucesivas sesiones.
npm install --no-audit --no-fund
