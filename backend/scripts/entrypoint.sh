#!/bin/sh
set -e

alembic upgrade head
python -m scripts.bootstrap_admin
python -m scripts.bootstrap_template

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
