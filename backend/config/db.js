const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in newer mongoose versions but kept for compatibility
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit the process immediately in case of connection error
    // This allows for retries and doesn't crash the server
    console.error('Will retry connecting to MongoDB...');
  }
};

module.exports = connectDB; 