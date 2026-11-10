# API SisLegal (Express + MariaDB)
FROM node:22-alpine
WORKDIR /app/server
COPY package*.json ./
RUN npm ci --only=production
COPY . ./
EXPOSE 8000
CMD ["node", "index.js"]
