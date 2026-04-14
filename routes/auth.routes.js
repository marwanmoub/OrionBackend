import express from "express";
import authController from "../controllers/auth.controllers.js";
import { generateOTP } from "../utils/otp.js";
import verifyToken from "../middlewares/auth.js";
const authRouter = express.Router();

authRouter.post("/login", authController.login);
authRouter.post("/signUp", authController.signUp);
authRouter.get("/logout", verifyToken, authController.logout);

authRouter.post("/pass-reset", authController.forgotPassword);
//OTP Related
authRouter.post("/verify-email", authController.OTP.checkOTP);
authRouter.post("/resend-otp", async (req, res) => {
  const response = await generateOTP(req.body?.email);
  if(response.status === true) {
    res.status(201).json({
      message: "OTP sent successfully",
      status: true
    });
  } else {
    res.status(400).json({
      message: "Failed to send OTP",
      status: false,
      error: response.error
    });
  }
});

export default authRouter;
