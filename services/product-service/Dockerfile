FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
