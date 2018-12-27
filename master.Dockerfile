FROM node:10.9.0-alpine
WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "start:master"]
