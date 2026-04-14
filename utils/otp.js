import nodemailer from "nodemailer";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function generateOTP(req, res) {
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
    const { email } = req.body;

    const info = await transporter.sendMail({
      from: `"Orion System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Orion: Your Verification Code",
      html: htmlContent,
    });

    let user = await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        email_verification_token: otp,
        email_token_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("OTP sent successfully!");
    console.log("Message ID:", info.messageId);
    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Failed to send email:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}
