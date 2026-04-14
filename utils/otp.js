import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";

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

const OTP = {
  generateOTP: async (req, res) => {
    // Logic for generating a simple 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
        <h2 style="color: #333;">Orion Verification</h2>
        <p style="font-size: 16px; color: #555;">Your security code is below. Do not share this with anyone.</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; border-radius: 5px;">
          ${otp}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #888;">This code will expire in 15 minutes.</p>
      </div>
    `;

    try {
      const {email}= req.body;


      // 2. Await the sendMail (Note: Nodemailer uses sendMail, not sendEmail)
      const info = await transporter.sendMail({
        from: `"Orion System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Orion: Your Verification Code",
        html: htmlContent, // This explicitly tells the client to render HTML
      });

      let user = prisma.users.update({
                where: {
                  email : email
                },
                data: {
                  email_verification_token: otp,
                  email_token_expires_at : new Date(Date.now() + 10 * 60 * 1000) 
                },
              });
      if(!user) {
        return res.status(404).json({ error: "User not found" });
      }
      email_verification_token
      console.log("OTP sent successfully!");
      console.log("Message ID:", info.messageId);
      return res.status(200).json({ message: "OTP sent successfully" });
    } catch (err) {
      console.error("Failed to send email:", err);
      return res.status(500).json({ error: "Failed to send OTP" });
    }
  },
  checkOTP: async (req, res) => {
        const { email , otp } = req.body;
    
        try {
    
        const user = await prisma.users.findUnique({
            where: { email: email },
        });
    
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
    
        if (user.email_verification_token === otp && user.email_token_expires_at > new Date(Date.now())) {
            await prisma.users.update({
            where: { email: u },
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
  }
};

OTP.generateOTP();