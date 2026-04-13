import express from "express";
import authController from "../controllers/auth.controllers";
const authRouter = express.Router();

authRouter.post("/login", authController.login);

export default authRouter;
