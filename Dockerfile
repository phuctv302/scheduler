FROM node:alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install
RUN npm install pm2 -g
RUN npm install nodemon -g

CMD ["npm", "start"]