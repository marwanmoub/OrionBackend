import express from "express";
import mapController from "../controllers/map.controller.js";
import verifyToken from "../middlewares/auth.js";

const mapRouter = express.Router();

mapRouter.get("/ar-models", mapController.getARModels);
mapRouter.get("/camera/ar-models", mapController.getARModels);
mapRouter.post(
  "/boundary-crossing",
  verifyToken,
  mapController.boundaryCrossing,
);
mapRouter.post(
  "/geofence/boundary-crossing",
  verifyToken,
  mapController.boundaryCrossing,
);

export default mapRouter;
