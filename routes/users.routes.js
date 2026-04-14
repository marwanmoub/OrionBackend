import express from "express";
import userController from "../controllers/users.controllers";
import verifyToken from "../middlewares/auth";
const userRouter = express.Router();

userRouter.get("/", verifyToken, userController.getAllUsers);

export default userRouter;
