import prisma from "../lib/prisma.js";
import argon2 from "argon2";

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
      const { id } = req.user;
      const { fullName } = req.body;

      if (!fullName || fullName.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Full name is required",
        });
      }

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
      const { id } = req.user;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          status: false,
          message: "All password fields are required",
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

      // Argon2 verification: (hash, plainText)
      const isPasswordValid = await argon2.verify(
        user.password,
        currentPassword,
      );

      if (!isPasswordValid) {
        return res.status(403).json({
          status: false,
          message: "Current password is incorrect",
        });
      }

      const isSamePassword = await argon2.verify(user.password, newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          status: false,
          message: "New password must be different from the current password",
        });
      }

      const hashedPassword = await argon2.hash(newPassword);

      await prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          refreshToken: null,
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

  updateSettings: async (req, res) => {
    try {
      const { id } = req.user;
      const updatedData = req.body;

      const settings = await prisma.userSettings.upsert({
        where: { userId: id },
        update: updatedData,
        create: {
          ...updatedData,
          userId: id,
        },
      });

      return res.status(200).json({
        status: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Update Settings Error:", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default userController;
