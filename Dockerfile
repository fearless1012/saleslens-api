FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
