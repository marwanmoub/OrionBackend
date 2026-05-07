import express from "express";
import staticController from "../controllers/static.controller.js";

const staticRouter = express.Router();

staticRouter.get("/faqs", staticController.getFAQ);
staticRouter.get("/information-zone", staticController.getInformationZone);

export default staticRouter;
