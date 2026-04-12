#!/usr/bin/env bash
# ============================================================
# start.sh — Script de démarrage SIG FTTH pour GitHub Codespace
# Lance : FastAPI (8000) + React/Vite (3000 PUBLIC)
# Maintient les processus actifs (keepalive)
# ============================================================

set -euo pipefail

# ─── Couleurs ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[SIG-FTTH]${RESET} $*"; }
ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $*${RESET}"; }
err()  { echo -e "${RED}❌ $*${RESET}"; }
info() { echo -e "${BLUE}ℹ️  $*${RESET}"; }

# ─── Banner ──────────────────────────────────────────────────
echo -e "${BOLD}${BLUE}"
cat << 'BANNER'
  ╔══════════════════════════════════════════╗
  ║     SIG FTTH — Démarrage Codespace       ║
  ║     React + FastAPI + PostGIS            ║
  ╚══════════════════════════════════════════╝
BANNER
echo -e "${RESET}"

# ─── Répertoire racine ───────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
log "Répertoire : $SCRIPT_DIR"

# ─── Tuer les anciens processus ──────────────────────────────
log "Nettoyage des processus existants..."
pkill -f "vite" 2>/dev/null && warn "Vite arrêté" || true
pkill -f "uvicorn" 2>/dev/null && warn "Uvicorn arrêté" || true
sleep 2

# ─── Vérifier les ports ──────────────────────────────────────
check_port() {
    local port=$1
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn "Port $port déjà utilisé — libération..."
        fuser -k "${port}/tcp" 2>/dev/null || true
        sleep 1
    fi
}
check_port 3000
check_port 8000

# ─── Logs ────────────────────────────────────────────────────
mkdir -p "$SCRIPT_DIR/logs"
FRONTEND_LOG="$SCRIPT_DIR/logs/frontend.log"
BACKEND_LOG="$SCRIPT_DIR/logs/backend.log"
> "$FRONTEND_LOG"
> "$BACKEND_LOG"

# ─── Lancer FastAPI ──────────────────────────────────────────
log "Démarrage FastAPI (port 8000)..."
if [ -d "$SCRIPT_DIR/backend" ]; then
    cd "$SCRIPT_DIR/backend"

    # Installer deps Python si venv absent
    if [ ! -d ".venv" ]; then
        warn "Création venv Python..."
        python3 -m venv .venv
    fi

    # Activer venv et installer
    source .venv/bin/activate 2>/dev/null || true
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt -q \
            --disable-pip-version-check 2>&1 \
            | tail -3 || warn "Erreur pip (non bloquant)"
    fi

    # Charger .env si présent
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs) 2>/dev/null || true
    elif [ -f "../.env" ]; then
        export $(grep -v '^#' ../.env | xargs) 2>/dev/null || true
    fi

    nohup python -m uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --reload \
        --log-level info \
        >> "$BACKEND_LOG" 2>&1 &

    BACKEND_PID=$!
    echo $BACKEND_PID > "$SCRIPT_DIR/logs/backend.pid"
    ok "FastAPI lancé (PID $BACKEND_PID)"
    cd "$SCRIPT_DIR"
else
    warn "Dossier backend/ introuvable — FastAPI ignoré"
    BACKEND_PID=""
fi

# ─── Lancer React/Vite ───────────────────────────────────────
log "Démarrage React/Vite (port 3000)..."
if [ -d "$SCRIPT_DIR/frontend" ]; then
    cd "$SCRIPT_DIR/frontend"

    # Installer node_modules si absent
    if [ ! -d "node_modules" ]; then
        warn "Installation npm..."
        npm ci --prefer-offline 2>&1 | tail -5 \
            || npm install 2>&1 | tail -5
    fi

    nohup npm run dev \
        >> "$FRONTEND_LOG" 2>&1 &

    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$SCRIPT_DIR/logs/frontend.pid"
    ok "React/Vite lancé (PID $FRONTEND_PID)"
    cd "$SCRIPT_DIR"
else
    err "Dossier frontend/ introuvable !"
    exit 1
fi

# ─── Attendre que Vite soit prêt ─────────────────────────────
log "Attente de Vite sur le port 3000..."
MAX_WAIT=30
waited=0
while ! curl -sf "http://localhost:3000" > /dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ $waited -ge $MAX_WAIT ]; then
        warn "Vite pas encore prêt après ${MAX_WAIT}s (normal en Codespace)"
        break
    fi
done
if [ $waited -lt $MAX_WAIT ]; then
    ok "Vite accessible en $waited secondes"
fi

# ─── Rendre le port 3000 PUBLIC (Codespace) ──────────────────
if command -v gh &>/dev/null && [ -n "${CODESPACE_NAME:-}" ]; then
    log "Configuration port 3000 PUBLIC via gh CLI..."
    gh codespace ports visibility 3000:public \
        -c "$CODESPACE_NAME" 2>/dev/null \
        && ok "Port 3000 rendu PUBLIC" \
        || warn "Impossible de configurer le port via gh CLI"
else
    warn "gh CLI ou CODESPACE_NAME absent"
    warn "→ Aller dans l'onglet 'Ports' et rendre le port 3000 Public manuellement"
fi

# ─── Afficher URLs ───────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════${RESET}"
echo -e "${BOLD}   ✅ SIG FTTH — PRÊT !${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════${RESET}"

if [ -n "${CODESPACE_NAME:-}" ]; then
    FRONTEND_URL="https://${CODESPACE_NAME}-3000.app.github.dev"
    BACKEND_URL="https://${CODESPACE_NAME}-8000.app.github.dev"
else
    FRONTEND_URL="http://localhost:3000"
    BACKEND_URL="http://localhost:8000"
fi

info "🌐 Frontend  : $FRONTEND_URL"
info "⚡ Backend   : $BACKEND_URL"
info "📚 API docs  : $BACKEND_URL/docs"
info "📋 Logs FE   : $FRONTEND_LOG"
info "📋 Logs BE   : $BACKEND_LOG"
echo ""

# ─── Trap pour nettoyage propre ──────────────────────────────
cleanup() {
    echo ""
    warn "Arrêt demandé — nettoyage..."
    [ -n "${FRONTEND_PID:-}" ] && \
        kill "$FRONTEND_PID" 2>/dev/null || true
    [ -n "${BACKEND_PID:-}" ] && \
        kill "$BACKEND_PID" 2>/dev/null || true
    ok "Processus arrêtés. Au revoir !"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Keepalive — maintenir le script actif ───────────────────
log "Surveillance des processus (Ctrl+C pour arrêter)..."
while true; do
    # Vérifier que les processus tournent encore
    if [ -n "${FRONTEND_PID:-}" ] && \
       ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        warn "Vite s'est arrêté ! Redémarrage..."
        cd "$SCRIPT_DIR/frontend"
        nohup npm run dev >> "$FRONTEND_LOG" 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > "$SCRIPT_DIR/logs/frontend.pid"
        ok "Vite redémarré (PID $FRONTEND_PID)"
        cd "$SCRIPT_DIR"
    fi

    if [ -n "${BACKEND_PID:-}" ] && \
       ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        warn "FastAPI s'est arrêté ! Redémarrage..."
        cd "$SCRIPT_DIR/backend"
        source .venv/bin/activate 2>/dev/null || true
        nohup python -m uvicorn app.main:app \
            --host 0.0.0.0 --port 8000 --reload \
            >> "$BACKEND_LOG" 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > "$SCRIPT_DIR/logs/backend.pid"
        ok "FastAPI redémarré (PID $BACKEND_PID)"
        cd "$SCRIPT_DIR"
    fi

    sleep 30
done
