FROM node:20-alpine

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm ci

# Code source
COPY . .

# Port dev
EXPOSE 3000

# Démarrage dev
CMD ["npm", "run", "dev", "--", "--host"]
