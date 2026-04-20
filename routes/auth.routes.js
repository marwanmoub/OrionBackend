import express from "express";
import authController from "../controllers/auth.controllers.js";
import { generateOTP } from "../utils/otp.js";
import verifyToken from "../middlewares/auth.js";
const authRouter = express.Router();

//TOKENS
authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post("/login", authController.login);
authRouter.post("/signUp", authController.signUp);
authRouter.get("/logout/:userId",verifyToken, authController.logout);

authRouter.post("/pass-reset", authController.forgotPassword);
//this one checks otp specifically for login and gives the tokens
authRouter.post("/check-2fa-login", authController.check2FA);
//OTP Related
authRouter.post("/verify-email", authController.OTP.checkOTP);
authRouter.post("/resend-otp", async (req, res) => {
  const response = await generateOTP(req.body?.email);

  if (response.status === true) {
    return res.status(201).json({
      message: "OTP sent successfully",
      status: true,
    });
  } else {
    return res.status(400).json({
      message: "Failed to send OTP",
      status: false,
      error: response.error,
    });
  }
});


export default authRouter;
