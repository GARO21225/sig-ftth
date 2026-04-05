# sig-ftth
SIG Web FTTH v6.1
# 🌐 SIG FTTH v6.1

**Système d'Information Géographique Web FTTH**
PCR v2.5 — Edgar KOUAME — 2026

---

## 🚀 Démarrage rapide

### Prérequis
- Compte GitHub
- Compte Railway (backend + DB)
- Compte Render (frontend)

### Lancement local (Docker)
```bash
# Cloner le repo
git clone https://github.com/ton-user/sig-ftth.git
cd sig-ftth

# Copier les variables d'environnement
cp .env.example .env

# Lancer tous les services
docker-compose up -d

# Vérifier
docker-compose ps
