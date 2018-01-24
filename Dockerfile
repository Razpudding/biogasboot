FROM node:latest
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build styles etc.
RUN npm run build

# Default port
EXPOSE 3000

# Run command
CMD [ "npm", "start" ]

