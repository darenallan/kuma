# CLAUDE.md

Ce fichier guide Claude Code pour travailler sur ce projet. À lire avant toute session de dev.

## Vue d'ensemble

Plateforme d'automatisation de génération de contrats pour un prestataire de services. Le client (l'utilisateur final) saisit les variables (nom du client final, prestation, montant, durée, clauses spécifiques), le système génère un contrat depuis un template, l'envoie en signature électronique, puis l'archive.

**Objectif produit** : réduire le temps de rédaction, éliminer les erreurs manuelles (montants, clauses oubliées, versions obsolètes), et donner une image professionnelle et traçable.

## Stack technique

- **Backend** : Python 3.11+ / FastAPI
- **Templating contrat** : Jinja2 (HTML) + WeasyPrint (HTML → PDF)
- **Base de données** : PostgreSQL
- **Frontend** : React
- **Signature électronique** : API Yousign (adapté marché français/africain)
- **Stockage fichiers** : S3-compatible ou disque chiffré Render
- **Déploiement** : Render

## Architecture cible

```
frontend/                → React — formulaire de saisie, dashboard des contrats
backend/
  app/
    main.py               → point d'entrée FastAPI
    routers/               → endpoints (contracts, clients, auth, templates)
    models/                → modèles SQLAlchemy
    schemas/                → schémas Pydantic (validation stricte)
    services/                → logique métier (génération PDF, appel Yousign)
    templates/                → templates Jinja2 des contrats (.html)
    core/                      → config, sécurité, session DB
  tests/
  requirements.txt
  alembic/                      → migrations DB
```

## Conventions de code

- Python : type hints stricts, Pydantic pour toute validation d'entrée, PEP8
- Un service = une responsabilité (pas de logique métier dans les routers)
- Commits atomiques, messages clairs et descriptifs
- Aucun secret en dur dans le code → variables d'environnement (`.env`, jamais commit, présent dans `.gitignore`)
- Tests unitaires obligatoires sur toute logique critique : génération de contrat, calculs, gestion des statuts

## Sécurité (OWASP) — non négociable

- `autoescape=True` sur Jinja2 (anti-injection HTML/XSS dans les templates de contrat)
- Auth JWT + contrôle d'accès par rôle (RBAC) sur tous les endpoints sensibles
- Validation stricte de toutes les entrées API via Pydantic (jamais de confiance dans l'input brut)
- Rate limiting sur les endpoints de génération et d'envoi
- Chiffrement au repos des PDF contractuels stockés (données sensibles)
- HTTPS obligatoire en production, aucun port non nécessaire exposé
- Logs d'audit sur génération / envoi / signature (traçabilité, conformité RGPD)
- Aucune donnée personnelle en clair dans les logs applicatifs
- Paramétrage des requêtes SQL (SQLAlchemy ORM) — jamais de concaténation de chaînes SQL

## Commandes

```bash
# Setup initial
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Lancer en dev
uvicorn app.main:app --reload

# Tests
pytest tests/ -v

# Migrations DB
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Notes pour Claude Code

- Prioriser un code prêt pour la production : modulaire, typé, testé.
- Toute route touchant aux données client (contrats, infos personnelles) doit être vérifiée pour : injection SQL, validation d'entrée, autorisation.
- Cible de déploiement : Render — prévoir la config via variables d'environnement, éviter tout chemin absolu local.
- Ce fichier doit être mis à jour au fur et à mesure que l'architecture évolue.
