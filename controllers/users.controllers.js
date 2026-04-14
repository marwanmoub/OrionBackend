import { PrismaClient } from "../generated/prisma";
import prisma from "../lib/prisma.js";

const userController = {
  getUser: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          is_email_verified: true,
          phone_verified: true,
          is_2fa_enabled: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "User retrieved successfully",
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [users, totalCount] = await prisma.$transaction([
        prisma.user.findMany({
          skip: skip,
          take: limit,
          select: {
            id: true,
            email: true,
            fullName: true,
            is_email_verified: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count(),
      ]);

      return res.status(200).json({
        status: true,
        message: "Users retrieved successfully",
        data: users,
        pagination: {
          total: totalCount,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default userController;
