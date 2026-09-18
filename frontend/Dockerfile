FROM node:22-alpine AS build
WORKDIR /app
ENV BACKEND_ORIGIN=http://backend:4000
COPY package.json package-lock.json ./
RUN npm ci
COPY next.config.mjs tsconfig.json ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY state ./state
RUN NODE_ENV=production node node_modules/next/dist/bin/next build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
