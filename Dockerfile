FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install nodemon globally for development
RUN npm install -g nodemon

# Copy application code
COPY . .

# Expose port and run in dev mode
EXPOSE 3000
CMD ["npm", "run", "dev"]
