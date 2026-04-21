import express from "express";
import userController from "../controllers/users.controller.js";
import staticController from "../controllers/static.controller.js";
import verifyToken from "../middlewares/auth.js";

const userRouter = express.Router();

// User Management
userRouter.get("/", verifyToken, userController.getAllUsers);
userRouter.patch("/change-name", verifyToken, userController.changeName);
userRouter.patch(
  "/change-password",
  verifyToken,
  userController.changePassword,
);

// Security & 2FA
userRouter.post("/enable-2fa", verifyToken, userController.enable2FA);
userRouter.post("/disable-2fa", verifyToken, userController.disable2FA);
userRouter.post("/confirm-2fa", verifyToken, userController.enable2FAConfirm);
userRouter.post(
  "/confirm-disable-2fa",
  verifyToken,
  userController.disable2FAConfirm,
);

// Account Deletion
userRouter.post(
  "/request-account-deletion",
  verifyToken,
  userController.deleteAccount,
);

// Static Content / FAQ
userRouter.get("/faq", verifyToken, staticController.getFAQ);

export default userRouter;
