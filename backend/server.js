require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');

// Express app
const app = express();
const PORT = process.env.PORT || 3009;
const FLOWISE_CHATBOT_ID = process.env.FLOWISE_CHATBOT_ID;
const FLOWISE_API_URL = process.env.FLOWISE_API_URL;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

// Debug environment variables
console.log('Environment variables loaded:');
console.log(`- PORT: ${PORT}`);
console.log(`- FLOWISE_CHATBOT_ID: ${FLOWISE_CHATBOT_ID ? FLOWISE_CHATBOT_ID : 'Not set'}`);
console.log(`- FLOWISE_API_URL: ${FLOWISE_API_URL ? FLOWISE_API_URL : 'Not set'}`);
console.log(`- FLOWISE_API_KEY: ${FLOWISE_API_KEY ? 'Set (masked for security)' : 'Not set'}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? 'Set (masked for security)' : 'Not set'}`);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Granite Chatbot Backend API' });
});

// Connect to MongoDB
connectDB();

// Create default admin user if it doesn't exist
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ username: process.env.DEFAULT_ADMIN_USERNAME });
    
    if (!adminExists) {
      await User.create({
        username: process.env.DEFAULT_ADMIN_USERNAME,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error with admin user:', error.message);
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/password'));
app.use('/api/users', require('./routes/users'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/test', require('./routes/test'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Flowise API URL: ${FLOWISE_API_URL}`);
  console.log(`Chatbot ID: ${FLOWISE_CHATBOT_ID}`);
  
  // Create default admin user
  setTimeout(async () => {
    try {
      await createAdminUser();
    } catch (error) {
      console.error('Failed to create admin user:', error);
    }
  }, 5000); // Wait 5 seconds for MongoDB to connect
}); 