FROM node:20

WORKDIR /server

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT = 5000

EXPOSE 5000

CMD [ "npm", "start" ]