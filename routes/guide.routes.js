/**
 * routes/guide.routes.js
 */

import express from "express";
import verifyToken from "../middlewares/auth.js";
import guideController from "../controllers/guide.controller.js";

const guideRouter = express.Router();

guideRouter.use(verifyToken);

guideRouter.post("/generate", guideController.generate);

export default guideRouter;
