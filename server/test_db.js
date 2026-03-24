import mongoose from "mongoose";
import Conversation from "./src/models/Conversation.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("Connected");
  const convs = await Conversation.find().sort({createdAt: -1}).limit(2).lean();
  console.log(JSON.stringify(convs, null, 2));
  process.exit();
}).catch(console.error);
