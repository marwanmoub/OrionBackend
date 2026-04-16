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

export default userRouter;
