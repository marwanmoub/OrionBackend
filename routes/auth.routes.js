import express from "express";
import authController from "../controllers/auth.controllers.js";
import { generateOTP } from "../utils/otp.js";
import { verifyToken } from "/middlewares/auth.js";

const authRouter = express.Router();
authRouter.post("/login", authController.login);
authRouter.post("/signUp", authController.signUp);
authRouter.get("/logout", verif);

//OTP Related
authRouter.post("/verify-email", authController.OTP.checkOTP);
authRouter.post("/resend-otp", (req, res) => {
  generateOTP(req.body?.email);
});

export default authRouter;
