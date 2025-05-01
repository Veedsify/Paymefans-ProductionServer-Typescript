import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_DB_URL as string, {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
    return null;
  }
};

const mongo = mongoose.connection;
mongo.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  setTimeout(connectDB, 5000);
});
mongo.once("open", () => {
  console.log("MongoDB connected successfully");
});

export {
  connectDB,
  mongo,
};
