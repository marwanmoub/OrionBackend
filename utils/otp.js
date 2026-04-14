import NodemailerHelper from 'nodemailer-otp';
import dotenv from 'dotenv';
import prisma from "/lib/prisma.ts";
import jwt from "jsonwebtoken";
dotenv.config();

const helper = new NodemailerHelper(process.env.EMAIL_USER, process.env.EMAIL_PASS);
const OTP = {
    generateOTP: async (req, res) =>{
        const {token}= req.body;
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.id;
        const otp = helper.generateOtp(6);
        try {
            const response = await helper.sendEmail(
              'recipient-email@example.com',
              'subject',
              'your message here!',
              otp
            );
            console.log(response);
          } catch (err) {
            console.error(err);
          }
    }

}