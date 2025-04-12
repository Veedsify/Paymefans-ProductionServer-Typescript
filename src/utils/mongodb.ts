import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_DB_URL as string, {
      autoIndex: true,
      maxPoolSize: 10,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const mongo = mongoose.connection;
mongo.on("error", console.error.bind(console, "MongoDB connection error:"));
mongo.once("open", () => {
  console.log("MongoDB connected successfully");
});

export {
  connectDB,
  mongo,
};
