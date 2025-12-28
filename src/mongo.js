const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function connectMongo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Fail fast, no fallback
  }
}

module.exports = connectMongo;
