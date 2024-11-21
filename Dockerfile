# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the project files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port for the app
EXPOSE 3000

# Run the application
CMD ["npm", "start"]
