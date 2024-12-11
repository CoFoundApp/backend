FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install nodemon globally for development
RUN npm install -g nodemon
RUN apk add --no-cache openssl

# Copy application code
COPY . .

# Prisma generate
RUN npx prisma generate

# Expose port and run in dev mode
EXPOSE 3000
CMD ["npm", "run", "dev"]
