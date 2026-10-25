# 초록동색: 클라이언트(vite build)와 서버(node server/index.js)를 한 이미지로 묶는다.
# 빌드 단계(build)와 실행 단계(run)를 나눠, 최종 이미지에는 vite·tailwind 같은 빌드 도구는 들어가지 않는다.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server

# 서버 기본 포트(PORT 환경변수로 바꿀 수 있다). fly.toml 의 internal_port 와 맞춰야 한다.
EXPOSE 8787

CMD ["node", "server/index.js"]
