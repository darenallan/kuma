# Kuma — génération automatisée de contrats

Plateforme qui automatise la rédaction des contrats d'un prestataire de services. L'utilisateur saisit les variables (client, prestation, montant, durée, clauses). Le système génère le contrat depuis un modèle, l'envoie en **signature électronique** (Yousign), puis l'archive.

## Stack

| Partie | Technologies |
|---|---|
| `backend/` | Python 3.11+, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, JWT (`python-jose`), Jinja2 + WeasyPrint (HTML vers PDF) |
| `frontend/` | React, Vite, React Router, Axios |
| Services | Yousign (signature), stockage de fichiers chiffré |

Fonctionnalités principales : authentification, clients, modèles de contrats avec variables, génération PDF, signature, tableau de bord, journal d'audit et limitation de débit.

## Démarrer en local

```bash
# API
cd backend
cp .env.example .env     # DATABASE_URL, SECRET_KEY, YOUSIGN_API_KEY, STORAGE_ENCRYPTION_KEY, ADMIN_*…
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Interface
cd frontend
npm install
npm run dev
```

Un `Dockerfile` est fourni pour le backend. Les conventions et l'architecture détaillées sont dans [`CLAUDE.md`](CLAUDE.md).

> Licence : aucune licence n'est déclarée dans ce dépôt (tous droits réservés par défaut).
