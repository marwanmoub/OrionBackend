import prisma from "../lib/prisma.js";
import { getNovaResponse } from "../utils/nova.js";

const chatController = {
  getAllChats: async (req, res) => {
    console.log("hi im getting chats");
    try {
      const userId = req.user.id;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 15);
      const skip = (page - 1) * limit;

      const [chats, totalCount] = await prisma.$transaction([
        prisma.chat.findMany({
          where: {
            participants: {
              some: { userId },
            },
          },
          orderBy: {
            last_activity_at: "desc",
          },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            type: true,
            last_activity_at: true,
            createdAt: true,
          },
        }),
        prisma.chat.count({
          where: {
            participants: {
              some: { userId },
            },
          },
        }),
      ]);

      console.log("I GOT THE CHATS!!");

      return res.status(200).json({
        status: true,
        data: chats,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  createChat: async (req, res) => {
    try {
      const { name } = req.body;
      const userId = req.user.id;

      const newChat = await prisma.chat.create({
        data: {
          type: "nova",
          name: name || "New Chat",
          last_activity_at: new Date(),
          participants: {
            create: {
              userId,
              isOwner: true,
            },
          },
        },
      });

      console.log("IM HERE NOW");

      return res.status(201).json({
        status: true,
        message: "Created Chat",
        data: newChat,
      });
    } catch (error) {
      console.error("PRISMA CREATE ERROR:", error); // ADD THIS LINE
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { message_text, firstMessage } = req.body;
      if (!message_text?.trim()) {
        return res
          .status(400)
          .json({ status: false, error: "message_text is required" });
      }

      const userId = req.user.id;
      const { chatId } = req.params;

      // Save user message FIRST
      const userMsg = await prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          sender_type: "user",
          message_text,
          sentAt: new Date(),
        },
      });

      // Then fetch history and call AI
      let history = [];
      if (!firstMessage) {
        history = await prisma.message.findMany({
          where: { chatId },
          take: 20,
          orderBy: { sentAt: "asc" },
        });
      }

      const novaResult = await getNovaResponse(message_text, history);

      // Save AI response + update chat
      const [aiMsg] = await prisma.$transaction([
        prisma.message.create({
          data: {
            chatId,
            senderId: null,
            sender_type: "bot",
            message_text: novaResult.message,
            sentAt: new Date(),
          },
        }),
        prisma.chat.update({
          where: { id: chatId },
          data: {
            last_activity_at: new Date(),
            ...(novaResult.title && { name: novaResult.title }),
          },
        }),
      ]);

      return res.status(201).json({
        status: true,
        data: aiMsg,
        newTitle: novaResult.title || null,
      });
    } catch (error) {
      console.error("SendMessage Error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: { chatId, userId },
        },
      });

      if (!participant) {
        return res.status(403).json({
          status: false,
          message: "You do not have access to this chat",
        });
      }

      const [messages, totalCount] = await prisma.$transaction([
        prisma.message.findMany({
          where: { chatId },
          orderBy: { sentAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            senderId: true,
            sender_type: true,
            message_text: true,
            sentAt: true,
            is_edited: true,
          },
        }),
        prisma.message.count({
          where: { chatId },
        }),
      ]);

      return res.status(200).json({
        status: true,
        data: messages,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("GetMessages Error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  deleteChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: { chatId, userId },
        },
      });

      if (!participant || !participant.isOwner) {
        return res.status(403).json({
          status: false,
          message: "Unauthorized to delete this chat",
        });
      }

      await prisma.$transaction([
        prisma.message.deleteMany({ where: { chatId } }),
        prisma.chatParticipant.deleteMany({ where: { chatId } }),
        prisma.chat.delete({ where: { id: chatId } }),
      ]);

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
  },
};

export default chatController;
