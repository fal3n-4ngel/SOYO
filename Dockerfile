# Base image
FROM node:18-alpine

# ffmpeg powers thumbnails, subtitle extraction and on-the-fly transcoding.
# Without it the container starts fine but every .mkv silently fails to play.
RUN apk add --no-cache ffmpeg

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

# Bind to every interface so the container is reachable from the host network.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run the application
CMD ["npm", "start"]
