FROM node:4.6
rUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
USER node
RUN npm install
EXPOSE 3000

CMD [ "node", "app.js" ]