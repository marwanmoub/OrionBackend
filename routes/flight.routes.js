const express = require("express");
const router = express.Router();
const {
  associateUserFlight,
  cancelFlight,
  getFlights,
} = require("../controllers/flightController");

// Replace `authenticate` with whatever your auth middleware is called
const authenticate = require("../middlewares/authenticate");

// GET /flights?page=1&limit=10&status=scheduled&departure_airport=BEY&arrival_airport=DXB
router.get("/", authenticate, getFlights);

// POST /flights/associate
// Body: { flight_number, passcode }
router.post("/associate", authenticate, associateUserFlight);

// DELETE /flights/cancel/:userFlightId
// Body: { password }
router.delete("/cancel/:userFlightId", authenticate, cancelFlight);

module.exports = router;
