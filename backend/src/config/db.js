// ./src/config/db.js
const mongoose = require("mongoose");
mongoose.set("bufferTimeoutMS", 0);


const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MONGO_URI not found in .env file");
    }

    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      tls: true, // Required for Atlas
    });

    console.log("Mongoose connected");
    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log("Connected DB name:", mongoose.connection.name);

    // Connection event listeners
    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err.message);
    });

    return conn;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }

    throw err;
  }
};

module.exports = connectDB;