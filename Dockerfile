# Build stage
FROM --platform=linux/amd64 node:16-alpine as build
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Runtime stage
FROM --platform=linux/amd64 node:16-alpine
WORKDIR /usr/src/app
COPY --from=build /usr/src/app .
EXPOSE 80
CMD ["yarn", "start"]
