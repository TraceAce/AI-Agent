const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  try {
    console.log(`Pre-save hook triggered for user: ${this.username}`);
    
    if (!this.isModified('password')) {
      console.log('Password not modified, skipping hashing');
      return next();
    }
    
    console.log('Password changed, hashing new password');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log(`Comparing passwords for user: ${this.username}`);
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log(`Password comparison result: ${isMatch ? 'Success' : 'Failed'}`);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', UserSchema); 