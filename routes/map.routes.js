import express from "express";
import mapController from "../controllers/map.controller.js";

const mapRouter = express.Router();

mapRouter.get("/ar-models", mapController.getARModels);
mapRouter.get("/camera/ar-models", mapController.getARModels);

export default mapRouter;
