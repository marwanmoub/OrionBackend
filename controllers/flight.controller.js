import prisma from "../lib/prisma.js";
import argon2 from "argon2";

const flightController = {
  associateUserFlight: async (req, res) => {
    try {
      const { flight_number, passcode } = req.body;
      const userId = req.user.id;

      if (!flight_number || !passcode) {
        return res.status(400).json({
          status: false,
          message: "Flight number and passcode are required.",
        });
      }

      const flight = await prisma.flight.findFirst({
        where: {
          flight_number: flight_number.trim().toUpperCase(),
          passcode: passcode.trim(),
          is_cancelled: false,
        },
      });

      if (!flight) {
        return res.status(404).json({
          status: false,
          message:
            "No active flight found with that flight number and passcode.",
        });
      }

      const existing = await prisma.userFlight.findFirst({
        where: { userId, flightId: flight.id },
      });

      if (existing) {
        return res.status(409).json({
          status: false,
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
            select: {
              departureAirport: {
                select: {
                  name: true,
                  city: true,
                  iata_code: true,
                },
              },
              arrivalAirport: {
                select: {
                  name: true,
                  city: true,
                  iata_code: true,
                },
              },
              gate: true,
              terminal: true,
              flight_number: true,
            },
          },
        },
      });

      return res.status(201).json({
        status: true,
        message: "Successfully associated with flight.",
        data: userFlight,
      });
    } catch (error) {
      console.error("associateUserFlight error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  cancelFlight: async (req, res) => {
    try {
      const { userFlightId } = req.params;
      const { password } = req.body;
      const userId = req.user.id;

      if (!password) {
        return res.status(400).json({
          status: false,
          message: "Password is required to confirm cancellation.",
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found." });
      }

      const isPasswordValid = await argon2.verify(user.password, password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ status: false, message: "Incorrect password." });
      }

      const userFlight = await prisma.userFlight.findFirst({
        where: { id: userFlightId, userId },
      });

      if (!userFlight) {
        return res.status(404).json({
          status: false,
          message: "Flight association not found or does not belong to you.",
        });
      }

      // Manual cascade deletion within a transaction
      const guides = await prisma.guide.findMany({
        where: { userFlightId },
        select: { id: true },
      });

      const guideIds = guides.map((g) => g.id);

      await prisma.$transaction([
        ...(guideIds.length > 0
          ? [
              prisma.checkListItem.deleteMany({
                where: { guideId: { in: guideIds } },
              }),
              prisma.guide.deleteMany({ where: { id: { in: guideIds } } }),
            ]
          : []),
        prisma.userFlight.delete({ where: { id: userFlightId } }),
      ]);

      return res.status(200).json({
        status: true,
        message: "Flight association cancelled successfully.",
      });
    } catch (error) {
      console.error("cancelFlight error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  getUserFlights: async (req, res) => {
    try {
      const userId = req.user.id;

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
      const skip = (page - 1) * limit;

      const where = {
        userId: userId,
        flight: {
          is_cancelled: false,
        },
      };

      const [userFlights, totalCount] = await prisma.$transaction([
        prisma.userFlight.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            flight: {
              scheduled_departure_time: "asc",
            },
          },
          include: {
            flight: {
              include: {
                departureAirport: {
                  select: { iata_code: true, name: true, city: true },
                },
                arrivalAirport: {
                  select: { iata_code: true, name: true, city: true },
                },
              },
            },
          },
        }),
        prisma.userFlight.count({ where }),
      ]);

      const sanitizedFlights = userFlights.map((uf) => {
        const { passcode, ...flightDetails } = uf.flight;
        return {
          userFlightId: uf.id,
          ...flightDetails,
        };
      });

      return res.status(200).json({
        status: true,
        data: sanitizedFlights,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("getUserFlights error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },
};

export default flightController;
