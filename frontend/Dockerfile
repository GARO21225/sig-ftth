# ─── Stage 1 : Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accepter les args de build pour Vite
ARG VITE_API_URL
ARG VITE_APP_VERSION=6.1.0
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ─── Stage 2 : Serve avec Nginx ─────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

# Config nginx SPA légère pour le container frontend seul
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / { try_files $uri $uri/ /index.html; }\n\
    location ~* \\.(js|css|png|ico|svg|woff2?)$ { expires 1y; add_header Cache-Control public; }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
