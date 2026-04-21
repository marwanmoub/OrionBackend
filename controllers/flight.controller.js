const prisma = require("../lib/prisma");
const confirmPassword = require("../utils/confirmPassword");

// ---------------------------------------------------------------------------
// POST /flights/associate
// Body: { flight_number, passcode }
//
// Associates the authenticated user with a specific flight.
// The user must supply both the flight number and the flight passcode.
// Using both together prevents blind passcode guessing — the user needs
// at least the flight number (which they'd know from their booking) plus
// the code distributed by the airline/admin.
// ---------------------------------------------------------------------------
const associateUserFlight = async (req, res) => {
  try {
    const { flight_number, passcode } = req.body;
    const userId = req.user.id;

    if (!flight_number || !passcode) {
      return res.status(400).json({
        message: "flight_number and passcode are required.",
      });
    }

    // Find the flight matching both identifiers
    const flight = await prisma.flight.findFirst({
      where: {
        flight_number: flight_number.trim().toUpperCase(),
        passcode: passcode.trim(),
        is_cancelled: false,
      },
    });

    if (!flight) {
      return res.status(404).json({
        message: "No active flight found with that flight number and passcode.",
      });
    }

    // Prevent duplicate associations
    const existing = await prisma.userFlight.findFirst({
      where: { userId, flightId: flight.id },
    });

    if (existing) {
      return res.status(409).json({
        message: "You are already associated with this flight.",
      });
    }

    const userFlight = await prisma.userFlight.create({
      data: {
        userId,
        flightId: flight.id,
      },
      include: {
        flight: {
          include: {
            departureAirport: true,
            arrivalAirport: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Successfully associated with flight.",
      data: userFlight,
    });
  } catch (error) {
    console.error("associateUserFlight error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ---------------------------------------------------------------------------
// DELETE /flights/cancel/:userFlightId
// Body: { password }
//
// Removes the user's association with a flight.
// Requires password confirmation so accidental or unauthorized cancellations
// are prevented.
// ---------------------------------------------------------------------------
const cancelFlight = async (req, res) => {
  try {
    const { userFlightId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res
        .status(400)
        .json({ message: "Password is required to confirm cancellation." });
    }

    // Fetch the user to verify password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordValid = await confirmPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // Verify this userFlight belongs to the requesting user
    const userFlight = await prisma.userFlight.findFirst({
      where: { id: userFlightId, userId },
      include: { flight: true },
    });

    if (!userFlight) {
      return res.status(404).json({
        message: "Flight association not found or does not belong to you.",
      });
    }

    // Delete associated guides and their checklist items first (cascade manually
    // since Prisma requires explicit deletes for nested relations without onDelete)
    const guides = await prisma.guide.findMany({
      where: { userFlightId },
      select: { id: true },
    });

    const guideIds = guides.map((g) => g.id);

    if (guideIds.length > 0) {
      await prisma.checkListItem.deleteMany({
        where: { guideId: { in: guideIds } },
      });
      await prisma.guide.deleteMany({ where: { id: { in: guideIds } } });
    }

    await prisma.userFlight.delete({ where: { id: userFlightId } });

    return res
      .status(200)
      .json({ message: "Flight association cancelled successfully." });
  } catch (error) {
    console.error("cancelFlight error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ---------------------------------------------------------------------------
// GET /flights
// Query params: page, limit, status, departure_airport, arrival_airport
//
// Returns a paginated list of all non-cancelled flights.
// Useful for browsing available flights before associating.
// ---------------------------------------------------------------------------
const getFlights = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Optional filters
    const { status, departure_airport, arrival_airport } = req.query;

    const where = {
      is_cancelled: false,
      ...(status && { status }),
      ...(departure_airport && {
        departureAirport: {
          iata_code: departure_airport.trim().toUpperCase(),
        },
      }),
      ...(arrival_airport && {
        arrivalAirport: {
          iata_code: arrival_airport.trim().toUpperCase(),
        },
      }),
    };

    const [flights, total] = await Promise.all([
      prisma.flight.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduled_departure_time: "asc" },
        include: {
          departureAirport: {
            select: { iata_code: true, name: true, city: true },
          },
          arrivalAirport: {
            select: { iata_code: true, name: true, city: true },
          },
        },
      }),
      prisma.flight.count({ where }),
    ]);

    // Strip the passcode from the response — users shouldn't be able to
    // discover passcodes just by listing flights
    const sanitized = flights.map(({ passcode: _passcode, ...rest }) => rest);

    return res.status(200).json({
      data: sanitized,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getFlights error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { associateUserFlight, cancelFlight, getFlights };
