FROM node:16

WORKDIR /opt/app

ENV NODE_ENV production

COPY package*.json ./

# RUN npm ci 

COPY . /opt/app

RUN npm install

CMD [ "npm", "dev" ]