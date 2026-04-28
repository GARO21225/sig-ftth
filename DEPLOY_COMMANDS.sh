#!/bin/bash
# Script de déploiement GitHub Pages

echo "=========================================="
echo "   DEPLOIEMENT SIG FTTH SUR GITHUB"
echo "=========================================="

# 1. Pousser la branche main
echo ""
echo "1/2. Push vers la branche main..."
git add .
git commit -m "fix: GitHub Pages routing - corrections appliquées"
git push origin main

# Attendre le workflow (optionnel - Skip si vous voulez un push séparé)
echo ""
echo "=========================================="
echo "   INSTRUCTIONS"
echo "=========================================="
echo ""
echo "A. Pour déployer via GitHub Actions (automatique):"
echo "   - Attendez que le workflow se termine (~3-5 min)"
echo "   - Vérifiez dans l'onglet Actions de votre repo"
echo ""
echo "B. Pour un push direct sur gh-pages:"
echo "   git subtree push --prefix=frontend/dist origin gh-pages"
echo ""
echo "C. Vérifiez la configuration GitHub Pages:"
echo "   - Settings > Pages"
echo "   - Source: Deploy from a branch"
echo "   - Branch: gh-pages / (root)"
echo ""
echo "=========================================="
echo "   URL FINALE"
echo "=========================================="
echo "   https://[VOTRE-USERNAME].github.io/sig-ftth/"
echo "=========================================="
