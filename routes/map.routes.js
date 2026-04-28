import express from "express";
import mapController from "../controllers/map.controller.js";

const mapRouter = express.Router();

mapRouter.get("/markers", mapController.getMarkersByQR);

export default mapRouter;
