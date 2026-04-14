import { generateAccessToken, generateRefreshToken } from "../utils/token";
import argon2 from "argon2";
import prisma from "../lib/prisma.js";
import { generateOTP } from "../utils/otp.js";

const authController = {
  login: async (req, res) => {
    try {
      let { email, phone, password } = req.body;

      let user;
      if (email) {
        user = await prisma.user.findUnique({
          where: {
            email: email,
          },
        });
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

      if (!isValid) return res.status(400).json({ error: "Wrong Password" });

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
      const userId = req.user.id;
      console.log(userId);

      const userUpdate = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          refreshToken: null,
        },
      });

      console.log(userUpdate);

      return res.status(200).json({ message: "Logged out successfully" });
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
    try{
    let {email} = req.body;
    generateOTP(email);
    console.log("Received forgot password request for email:", email);
    return res.status(200).json({ message: "Password Reset Request Sent successfully" });
    
    }catch(err){
        console.error(err);
        return res.status(500).json({ error: "Failed to generate OTP" });
    }
  },
  forgotPassword: async (req, res) => {
    const { email,password, otp } = req.body;

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
            password:newHashedPassword,
            email_verification_token: null,
            email_token_expires_at: null,
          },
        });
        console.log("Password Reset Successfully!");
        return res
          .status(200)
          .json({ message: "Password Reset successfully" });
      } else {
        console.log("Invalid or expired OTP");
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      return res.status(500).json({ error: "Failed to verify OTP" });
    }
  },
};

export default authController;
