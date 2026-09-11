FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ && npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libstdc++

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/artifacts ./artifacts
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
