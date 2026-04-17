FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
