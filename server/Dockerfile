FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --legacy-peer-deps

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm run build

RUN npx prisma migrate deploy

EXPOSE 3001

CMD ["node", "dist/index.js"]