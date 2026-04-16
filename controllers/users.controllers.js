import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";

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

  changeName: async (req, res) => {
    try {
      const { id } = req.user; // injected by verifyToken middleware
      const { fullName } = req.body;

      if (!fullName || fullName.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Full name is required",
        });
      }

      // Enforce a cooldown period of 30 days between name changes
      const user = await prisma.user.findUnique({
        where: { id },
        select: { last_username_changed: true },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      if (user.last_username_changed) {
        const daysSinceLastChange =
          (Date.now() - new Date(user.last_username_changed).getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysSinceLastChange < 30) {
          const daysRemaining = Math.ceil(30 - daysSinceLastChange);
          return res.status(429).json({
            status: false,
            message: `You can change your name again in ${daysRemaining} day(s)`,
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName: fullName.trim(),
          last_username_changed: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      });

      return res.status(200).json({
        status: true,
        message: "Name updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { id } = req.user; // injected by verifyToken middleware
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          status: false,
          message:
            "currentPassword, newPassword, and confirmPassword are required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          status: false,
          message: "New password and confirm password do not match",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          status: false,
          message: "New password must be at least 8 characters long",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { password: true },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          status: false,
          message: "Current password is incorrect",
        });
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          status: false,
          message: "New password must be different from the current password",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          refreshToken: null, // invalidate existing sessions
        },
      });

      return res.status(200).json({
        status: true,
        message: "Password updated successfully. Please log in again.",
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
