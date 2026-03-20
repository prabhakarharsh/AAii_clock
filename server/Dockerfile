FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate

RUN npx prisma migrate deploy

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]