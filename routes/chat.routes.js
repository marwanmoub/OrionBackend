import express from "express";
import verifyToken from "../middlewares/auth.js";
import chatController from "../controllers/chat.controller.js";

const chatRouter = express.Router();

// Apply authentication middleware to all chat routes
chatRouter.use(verifyToken);

chatRouter.get("/", chatController.getAllChats);

chatRouter.post("/", chatController.createChat);

chatRouter.post("/:chatId/message", chatController.sendMessage);

chatRouter.get("/:chatId/messages", chatController.getChatMessages);

chatRouter.delete("/:chatId", chatController.deleteChat);

export default chatRouter;
