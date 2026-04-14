import { generateAccessToken, generateRefreshToken } from "../utils/token";
//import prisma from "/lib/prisma.ts";
import argon2 from "argon2";
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import prisma from '../lib/prisma.js';
dotenv.config();

// Standard Node fix for self-signed certificate issues in dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// 1. Create the Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
  OTP : {
    checkOTP: async (req, res) => {
          const { email , otp } = req.body;
      
          try {
      
          const user = await prisma.user.findUnique({
              where: { email: email },
          });
      
          if (!user) {
              return res.status(404).json({ error: "User not found" });
          }
      
          if (user.email_verification_token === otp && user.email_token_expires_at > new Date(Date.now())) {
              await prisma.user.update({
              where: { email: email },
              data: {
                  is_email_verified: true,
                  email_verification_token: null,
                  email_token_expires_at: null,
              },
              });
              console.log("Email verified successfully!");
              return res.status(200).json({ message: "Email verified successfully" });
          } else {
              console.log("Invalid or expired OTP");
              return res.status(400).json({ error: "Invalid or expired OTP" });
          }
          } catch (err) {
          console.error("Error verifying OTP:", err);
          return res.status(500).json({ error: "Failed to verify OTP" });
          }
    },
    
  }
};

export default authController;
