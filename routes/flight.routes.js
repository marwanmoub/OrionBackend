import express from "express";
import flightController from "../controllers/flight.controller.js";
import verifyToken from "../middlewares/auth.js";

const flightRouter = express.Router();

flightRouter.use(verifyToken);

flightRouter.get("/", flightController.getUserFlights);
flightRouter.get("/with-guides", flightController.getUserFlightsWithGuides);
flightRouter.get("/:id", flightController.getFlight);

flightRouter.post("/associate", flightController.associateUserFlight);

flightRouter.delete("/cancel/:userFlightId", flightController.cancelFlight);

export default flightRouter;
