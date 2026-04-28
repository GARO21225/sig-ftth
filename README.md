# SIG FTTH - GitHub Pages

## IMPORTANT - Ne pas modifier directement
Ce dossier contient les fichiers pré-construits pour GitHub Pages.
Les modifications doivent être faites dans la branche 'main' puis déployées automatiquement.

## Comment déployer
```bash
# Depuis la branche main
git checkout main
git subtree push --prefix=frontend/dist origin gh-pages
```

Ou utilisez le workflow GitHub Actions qui déploie automatiquement.

## URL de l'application
https://[votre-username].github.io/sig-ftth/
