FROM node:14

# Create app directory
WORKDIR /app

# COPY package.json /app/

# RUN npm install

COPY . .

# RUN npm run build

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]

# Change env to test or production

# npm run build
# docker-compose build
# docker push dtuncbilek/dt-binance-bot:0.0.1

# in server
# docker pull dtuncbilek/dt-binance-bot:0.0.1
# docker-compose up -d

# npm run build