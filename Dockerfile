FROM node:14

WORKDIR /app

COPY . .

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]

# LOCAL CONTAINER
# Change env to test or production
# npm run build
# docker-compose up -d

# FOR SERVER
# Change env to test or production
# npm run build
# docker-compose build
# docker push dtuncbilek/dt-binance-bot:0.0.1

# in server
# docker pull dtuncbilek/dt-binance-bot:0.0.1
# docker-compose up -d