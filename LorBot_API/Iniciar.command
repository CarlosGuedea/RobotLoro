#!/bin/bash
set -e

cd "$(dirname "$0")"
python3 -m venv .venv
if ! cmp -s requirements.txt .venv/installed-requirements.txt; then
    .venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt
    cp requirements.txt .venv/installed-requirements.txt
fi
exec .venv/bin/python app.py
