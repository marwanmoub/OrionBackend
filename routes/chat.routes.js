import express from "express";
import verifyToken from "../middlewares/auth.js";
import chatController from "../controllers/chat.controllers.js";

const chatRouter = express.Router();

// Apply authentication middleware to all chat routes
chatRouter.use(verifyToken);

chatRouter.get("/", chatController.getAllChats);

chatRouter.post("/", chatController.createChat);

chatRouter.post("/:chatId/message", chatController.sendMessage);

chatRouter.delete("/:chatId", chatController.deleteChat);

export default chatRouter;
