import nodemailer from "nodemailer";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function generateOTP(email) {
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
    await transporter.sendMail({
      from: `"Orion System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Orion: Your Verification Code",
      html: htmlContent,
    });

    const updateUser = await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        email_verification_token: otp,
        email_token_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    console.log(updateUser);

    if (updateUser) {
      return {
        status: true,
      };
    } else {
      status: false;
    }
  } catch (err) {
    console.error("Failed to send email:", err);
    return { status: false, error: err.message };
  }
}
