FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Create uploads dir
RUN mkdir -p /app/uploads

EXPOSE 3001

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["npm", "start", "--", "-p", "3001", "--hostname", "0.0.0.0"]
