import express from "express";
import authController from "../controllers/auth.controllers.js";
import OTP, { generateOTP } from "../utils/otp.js";

const authRouter = express.Router();
authRouter.post("/login", authController.login);
authRouter.post("/signUp", authController.signUp);

//OTP Related
authRouter.post("/verify-email", authController.OTP.checkOTP);
authRouter.post("/resend-otp", generateOTP);

export default authRouter;
