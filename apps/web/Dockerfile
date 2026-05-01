FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 3003

# Ensure we use npm run dev to correctly resolve binaries
CMD ["npm", "run", "dev"]
