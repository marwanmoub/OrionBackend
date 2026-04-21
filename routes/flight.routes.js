import flightController from "../controllers/flight.controller";
import verifyToken from "../middlewares/auth";
import express from "express";

const flightRouter = express.Router();

flightRouter.use(verifyToken);

flightRouter.get("/", flightController.getUserFlights);

flightRouter.post("/associate", flightController.associateUserFlight);

flightRouter.delete("/cancel/:userFlightId", flightController.cancelFlight);

export default flightRouter;
