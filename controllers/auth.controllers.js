import { generateAccessToken, generateRefreshToken } from "../utils/token";
import argon2 from "argon2";
import prisma from "../lib/prisma.js";
import { generateOTP } from "../utils/otp.js";
import jwt from "jsonwebtoken";

const authController = {
  login: async (req, res) => {
    try {
      console.log("hi");
      let { email, phone, password } = req.body;

      let user;
      if (email) {
        user = await prisma.user.findUnique({
          where: {
            email: email,
          },
        });

        console.log("hellooo");
      } else if (phone) {
        user = await prisma.user.findUnique({
          where: {
            phone: phone,
          },
        });
      }

      if (!user) {
        return res.status(400).send("User not found");
      }

      const isValid = await argon2.verify(user.password, password);

      if (!isValid) return res.status(400).json({ message: "Wrong Password" });
      console.log("hello");

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
        },
      });

      res.status(201).json({
        message: "Login successful",
        accessToken: accessToken,
        refreshToken,
        fullName: user.fullName,
        email: user.email,
        is_email_verified: user.is_email_verified,
        is_2fa_enabled: user.is_2fa_enabled,
        userId: user.id,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },

  signUp: async (req, res) => {
    try {
      let { fullName, email, phone, password } = req.body;
      const hashedPassword = await argon2.hash(password);

      const userProperties = {
        fullName,
        password: hashedPassword,
      };

      if (email) {
        userProperties.email = email;
      }

      if (phone) {
        userProperties.phone = phone;
      }

      const createUser = await prisma.user.create({
        data: userProperties,
      });

      if (!createUser) {
        return res.status(400).json({
          message: "Failed to create user",
        });
      }

      generateOTP(userProperties.email);

      return res.status(201).json({
        message: "User created successfully",
        user: {
          id: createUser.id,
          fullName: createUser.fullName,
          email: createUser.email,
          phone: createUser.phone,
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Email or phone already exists" });
      }

      console.error(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
  logout: async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(userId);

      const userUpdate = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          refreshToken: null,
        },
      });

      if (userUpdate) {
        console.log("whats up");
        return res.status(200).json({ message: "Logged out successfully" });
      } else {
        return res.status(400).json({ message: "Could not log out user" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  OTP: {
    checkOTP: async (req, res) => {
      const { email, otp } = req.body;

      try {
        const user = await prisma.user.findUnique({
          where: { email: email },
        });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (
          user.email_verification_token === otp &&
          user.email_token_expires_at > new Date(Date.now())
        ) {
          await prisma.user.update({
            where: { email: email },
            data: {
              is_email_verified: true,
              email_verification_token: null,
              email_token_expires_at: null,
            },
          });
          console.log("Email verified successfully!");
          return res
            .status(200)
            .json({ message: "Email verified successfully" });
        } else {
          console.log("Invalid or expired OTP");
          return res.status(400).json({ error: "Invalid or expired OTP" });
        }
      } catch (err) {
        console.error("Error verifying OTP:", err);
        return res.status(500).json({ error: "Failed to verify OTP" });
      }
    },
  },
  // this function exists if you need it
  forgotPasswordRequest: async (req, res) => {
    try {
      let { email } = req.body;
      generateOTP(email);
      console.log("Received forgot password request for email:", email);
      return res
        .status(200)
        .json({ message: "Password Reset Request Sent successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to generate OTP" });
    }
  },
  forgotPassword: async (req, res) => {
    const { email, password, otp } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      let newHashedPassword = await argon2.hash(password);

      if (
        user.email_verification_token === otp &&
        user.email_token_expires_at > new Date(Date.now())
      ) {
        await prisma.user.update({
          where: { email: email },
          data: {
            password: newHashedPassword,
            email_verification_token: null,
            email_token_expires_at: null,
          },
        });
        console.log("Password Reset Successfully!");
        return res.status(201).json({ message: "Password Reset successfully" });
      } else {
        console.log("Invalid or expired OTP");
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      return res.status(500).json({ error: "Failed to verify OTP" });
    }
  },
  refreshToken: async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token)
      return res.status(401).json({ message: "Refresh Token required" });

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user.id);

    res.status(200).json({ accessToken: newAccessToken });
    try {
    } catch (err) {
      return res.status(403).json({ message: "Token expired or invalid" });
    }
  },
};

export default authController;
