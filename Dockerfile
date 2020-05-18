FROM node:10-alpine as webapi
RUN mkdir -p /usr/app
WORKDIR /usr/app/
COPY package.json constants.js app.js  ./
RUN npm install
ENTRYPOINT ["node","app.js"]