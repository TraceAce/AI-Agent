# Flowise Chatbot UI

A modern UI for Flowise chatbot built with React, TypeScript, Node.js, and Docker.

## Project Structure

```
.
├── backend/              # Express.js server
│   ├── server.js         # Main server file
│   ├── package.json      # Backend dependencies
│   └── Dockerfile        # Backend Docker configuration
├── frontend/             # React TypeScript application
│   ├── public/           # Static assets
│   ├── src/              # React source code
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript type definitions
│   ├── package.json      # Frontend dependencies
│   ├── tsconfig.json     # TypeScript configuration
│   ├── Dockerfile        # Frontend Docker configuration
│   └── nginx.conf        # Nginx configuration for production
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # Documentation
```

## Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- TypeScript (for frontend development)

## Environment Variables

### Backend

- `PORT`: The port on which the backend server runs (default: 3009)
- `FLOWISE_CHATBOT_ID`: Your Flowise chatbot ID
- `FLOWISE_API_URL`: The URL of the Flowise API
- `FLOWISE_API_KEY`: Optional API key for authenticated Flowise instances

### Frontend

- `REACT_APP_API_URL`: URL of the backend API

## Running with Docker Compose

1. Clone this repository:

```bash
git clone <repository-url>
cd flowise-chatbot-ui
```

2. Start the containers:

```bash
docker-compose up -d
```

This will:
- Build and start the backend container
- Build and start the frontend container

3. Access the application:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:3009

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## TypeScript Features

The frontend is built with TypeScript for improved developer experience and code quality:

- Strongly typed React components
- Interface definitions for API requests and responses
- Type safety for state management
- Improved code completion and documentation

## Using the Chatbot

1. Navigate to http://localhost:80 in your browser
2. Start chatting with the Flowise chatbot
3. Enjoy the modern UI experience!

## Troubleshooting

### Connection Issues

If you're experiencing connection issues between the frontend and backend:

1. Ensure both containers are running:
   ```bash
   docker-compose ps
   ```

2. Check backend logs for errors:
   ```bash
   docker-compose logs backend
   ```

3. Verify the backend API is accessible:
   - Open http://localhost:3009/ in your browser
   - You should see a JSON response: `{ "status": "ok", "message": "Flowise Chatbot Backend API" }`

4. Check that the frontend can reach the backend:
   - Make sure your browser's network console doesn't show CORS errors
   - Ensure the API URL in the frontend environment is correctly pointing to the backend

5. Rebuild the containers if needed:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### TypeScript Issues

If you encounter TypeScript errors during development:

1. Make sure all dependencies are installed:
   ```bash
   cd frontend
   npm install
   ```

2. Check for type definition errors:
   ```bash
   cd frontend
   npx tsc --noEmit
   ```

## License

MIT 