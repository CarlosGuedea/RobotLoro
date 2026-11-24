#!/bin/bash
# Inicia el backend de StudyBot Loro y sirve el dashboard en http://localhost:8000.
# Requiere la API LorBot iniciada aparte (LorBot_API/Iniciar.command).
# Argumentos extra se pasan a server.py, p. ej.: ./Iniciar.command --camera-url http://192.168.1.50
set -e

cd "$(dirname "$0")"
python3 -m venv .venv
if ! cmp -s backend/requirements.txt .venv/installed-requirements.txt; then
    .venv/bin/python -m pip install --disable-pip-version-check -r backend/requirements.txt
    cp backend/requirements.txt .venv/installed-requirements.txt
fi
if [ ! -f frontend_new/dist/index.html ]; then
    npm --prefix frontend_new ci
    npm --prefix frontend_new run build
fi
exec .venv/bin/python backend/server.py "$@"
