FROM python:3.11-slim

# Librairies systeme requises par WeasyPrint (Pango, Cairo, GDK-Pixbuf, polices)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x scripts/entrypoint.sh

EXPOSE 8000

# Applique les migrations, bootstrap un admin si besoin (ADMIN_EMAIL/ADMIN_PASSWORD),
# puis demarre l'API. Necessaire sur les plateformes sans acces shell (ex: Render free tier).
CMD ["scripts/entrypoint.sh"]
