import prisma from "../lib/prisma.js";

const chatController = {
  getAllChats: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      //   const [chats, total] = await prisma.$transaction([
      //     prisma.chat.findMany({
      //       where: {
      //         participants: {
      //           some: { userId },
      //         },
      //       },
      //       orderBy: {
      //         last_activity_at: "desc",
      //       },
      //       skip,
      //       take: limit,
      //       select: {
      //         id: true,
      //         name: true,
      //         last_activity_at: true,
      //         createdAt: true,
      //       },
      //     }),
      //     prisma.chat.count({
      //       where: {
      //         participants: {
      //           some: { userId },
      //         },
      //       },
      //     }),
      //   ]);

      const chats = await prisma.chat.findMany({
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
          last_activity_at: true,
          createdAt: true,
        },
      });

      return res.status(200).json({
        data: chats,
        meta: {
          //   total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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
        // select: {
        //   id: true,
        //   type: true,
        //   name: true,
        //   createdAt: true,
        // },
      });

      return res.status(201).json({
        message: "Created Chat",
        status: true,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this chat", status: false });
      }

      await prisma.$transaction([
        prisma.message.deleteMany({ where: { chatId } }),
        prisma.chatParticipant.deleteMany({ where: { chatId } }),
        prisma.chat.delete({ where: { id: chatId } }),
      ]);

      return res.status(204).json({
        message: "Error deleting chat",
        status: false,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
};

export default chatController;
