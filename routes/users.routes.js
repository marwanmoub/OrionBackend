import express from "express";
import userController from "../controllers/users.controllers";
import verifyToken from "../middlewares/auth";

const userRouter = express.Router();

userRouter.get("/", verifyToken, userController.getAllUsers);
userRouter.patch("/change-name", verifyToken, userController.changeName);
userRouter.patch(
  "/change-password",
  verifyToken,
  userController.changePassword,
);
userRouter.post("/enable-2fa", verifyToken, userController.enable2FA);
userRouter.post("/disable-2fa", verifyToken, userController.disable2FA);
userRouter.post("/confirm-2fa", verifyToken, userController.enable2FAConfirm);
userRouter.post("/confirm-disable-2fa", verifyToken, userController.disable2FAConfirm);
userRouter.post("/request-account-deletion", verifyToken, userController.deleteAccount);
export default userRouter;
