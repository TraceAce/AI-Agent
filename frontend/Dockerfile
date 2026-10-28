FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

# Copy dependency scripts
COPY ensure-types.sh ./
RUN chmod +x ensure-types.sh

# Install dependencies
RUN npm install

# Install TypeScript type definitions
RUN ./ensure-types.sh

# Copy all files
COPY . .

# Build TypeScript app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add cache busting
ENV NGINX_CACHE_VERSION=1.0.0

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"] 