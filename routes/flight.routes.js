import express from "express";
import flightController from "../controllers/flight.controller.js";
import verifyToken from "../middlewares/auth.js";

const flightRouter = express.Router();

flightRouter.use(verifyToken);

flightRouter.get("/", flightController.getUserFlights);

flightRouter.post("/associate", flightController.associateUserFlight);

flightRouter.get("/:userFlightId/checklist", flightController.getChecklist);
flightRouter.put("/:userFlightId/checklist", flightController.updateChecklist);
flightRouter.patch(
  "/:userFlightId/checklist/:itemId",
  flightController.updateChecklistItem,
);

flightRouter.delete("/cancel/:userFlightId", flightController.cancelFlight);

export default flightRouter;
