import express from "express";
import authController from "../controllers/auth.controllers.js";
import OTP from "../utils/otp.js";

const authRouter = express.Router();
authRouter.post("/login", authController.login);
authRouter.post("/signUp", authController.signUp);
authRouter.post("/verify-email", authController.OTP.checkOTP);


export default authRouter;
