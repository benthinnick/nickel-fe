FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY root-config/package.json root-config/package.json
COPY apps/catalog/package.json apps/catalog/package.json
COPY apps/cart/package.json apps/cart/package.json
COPY apps/account/package.json apps/account/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/fixtures/package.json packages/fixtures/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

EXPOSE 9000 9001 9002 9003

CMD ["npm", "run", "dev", "-w", "@nickel/root-config"]
