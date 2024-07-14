# Use the official Node.js image from the Docker Hub
FROM node:16

# Create and change to the app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source code
COPY . .

# Install wkhtmltopdf and xvfb
RUN apt-get update && apt-get install -y xvfb wkhtmltopdf

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
