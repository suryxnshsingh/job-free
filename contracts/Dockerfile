FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git python3 make g++

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Compile contracts
RUN npm run compile

# Expose Hardhat node port
EXPOSE 8545

# Default command
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]