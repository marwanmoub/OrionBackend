import prisma from "../lib/prisma.js";
import argon2 from "argon2";

const CHECKLIST_TEMPLATE_SEEDS = [
  {
    item_type: "check-in",
    taskName: "Ticket Check-in",
    default_due_offset_hours: -3,
    is_mandatory: true,
  },
  {
    item_type: "security",
    taskName: "Security",
    default_due_offset_hours: -2,
    is_mandatory: true,
  },
  {
    item_type: "boarding",
    taskName: "Boarding",
    default_due_offset_hours: -1,
    is_mandatory: true,
  },
  {
    item_type: "arrival",
    taskName: "Arrival",
    default_due_offset_hours: 3,
    is_mandatory: false,
  },
];

const CHECKLIST_ORDER = new Map(
  CHECKLIST_TEMPLATE_SEEDS.map((item, index) => [item.item_type, index]),
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getDepartureTime = (flight) =>
  flight.expected_departure_time ?? flight.scheduled_departure_time;

const getChecklistDueTime = (flight, template) => {
  const departureTime = getDepartureTime(flight);
  return new Date(
    departureTime.getTime() + template.default_due_offset_hours * 60 * 60 * 1000,
  );
};

const getFlightSimulation = (flight, now = new Date()) => {
  const scheduled = flight.scheduled_departure_time;
  const departure = getDepartureTime(flight);
  const minutesToDeparture = Math.round(
    (departure.getTime() - now.getTime()) / 60000,
  );
  const delayMinutes = Math.round(
    (departure.getTime() - scheduled.getTime()) / 60000,
  );

  let status = flight.status;
  let phase = "scheduled";

  if (flight.is_cancelled) {
    status = "CANCELLED";
    phase = "cancelled";
  } else if (minutesToDeparture <= -180) {
    status = "LANDED";
    phase = "arrival";
  } else if (minutesToDeparture <= -10) {
    status = "DEPARTED";
    phase = "in_air";
  } else if (minutesToDeparture <= 15) {
    status = "FINAL_CALL";
    phase = "boarding";
  } else if (minutesToDeparture <= 45) {
    status = "BOARDING";
    phase = "boarding";
  } else if (delayMinutes >= 10) {
    status = "DELAYED";
    phase = "delayed";
  } else if (minutesToDeparture <= 180) {
    status = "CHECK_IN_OPEN";
    phase = "airport";
  } else {
    status = "SCHEDULED";
  }

  const journeyStart = departure.getTime() - 3 * 60 * 60 * 1000;
  const journeyEnd = departure.getTime() + 3 * 60 * 60 * 1000;
  const progress = clamp(
    (now.getTime() - journeyStart) / (journeyEnd - journeyStart),
    0,
    1,
  );

  return {
    status,
    phase,
    serverTime: now.toISOString(),
    minutesToDeparture,
    delayMinutes: Math.max(0, delayMinutes),
    progress,
  };
};

const ensureChecklistTemplates = async (client = prisma) => {
  const templates = [];

  for (const template of CHECKLIST_TEMPLATE_SEEDS) {
    templates.push(
      await client.checkListTemplate.upsert({
        where: { item_type: template.item_type },
        update: template,
        create: template,
      }),
    );
  }

  return templates.sort(
    (a, b) =>
      (CHECKLIST_ORDER.get(a.item_type) ?? 999) -
      (CHECKLIST_ORDER.get(b.item_type) ?? 999),
  );
};

const ensureGuideForUserFlight = async (userFlight, client = prisma) => {
  const templates = await ensureChecklistTemplates(client);
  let guide = await client.guide.findFirst({
    where: { userFlightId: userFlight.id },
    include: { checklistItems: true },
  });

  if (!guide) {
    guide = await client.guide.create({
      data: {
        flightId: userFlight.flightId,
        userFlightId: userFlight.id,
        guide_generation_time: new Date(),
        departure_from_home_time: new Date(
          getDepartureTime(userFlight.flight).getTime() - 4 * 60 * 60 * 1000,
        ),
        used_airport_id: userFlight.flight.departure_airport_id,
        checklistItems: {
          create: templates.map((template) => ({
            templateId: template.id,
            due_time: getChecklistDueTime(userFlight.flight, template),
            is_completed: false,
          })),
        },
      },
      include: { checklistItems: true },
    });
  }

  const existingTemplateIds = new Set(
    guide.checklistItems.map((item) => item.templateId).filter(Boolean),
  );
  const missingTemplates = templates.filter(
    (template) => !existingTemplateIds.has(template.id),
  );

  if (missingTemplates.length > 0) {
    await client.checkListItem.createMany({
      data: missingTemplates.map((template) => ({
        guideId: guide.id,
        templateId: template.id,
        due_time: getChecklistDueTime(userFlight.flight, template),
        is_completed: false,
      })),
    });
  }

  return client.guide.findFirst({
    where: { id: guide.id },
    include: {
      checklistItems: {
        include: { template: true },
        orderBy: { due_time: "asc" },
      },
    },
  });
};

const formatChecklistItems = (items = []) =>
  [...items]
    .sort((a, b) => {
      const aType = a.template?.item_type;
      const bType = b.template?.item_type;
      return (
        (CHECKLIST_ORDER.get(aType) ?? 999) -
        (CHECKLIST_ORDER.get(bType) ?? 999)
      );
    })
    .map((item) => ({
      id: item.template?.item_type ?? item.id,
      backendId: item.id,
      title: item.template?.taskName ?? "Journey Step",
      itemType: item.template?.item_type ?? null,
      dueTime: item.due_time.toISOString(),
      isCompleted: item.is_completed,
      is_completed: item.is_completed,
      isMandatory: item.template?.is_mandatory ?? false,
    }));

const getPrimaryGuide = (userFlight) => userFlight.guides?.[0] ?? null;

const formatRegisteredFlight = (userFlight, now = new Date()) => {
  const { passcode, ...flight } = userFlight.flight;
  const simulation = getFlightSimulation(userFlight.flight, now);
  const guide = getPrimaryGuide(userFlight);

  return {
    userFlightId: userFlight.id,
    guideId: guide?.id ?? null,
    ...flight,
    status: simulation.status,
    persisted_status: userFlight.flight.status,
    simulation,
    checklistItems: formatChecklistItems(guide?.checklistItems ?? []),
  };
};

const formatAssociationPayload = (userFlight, now = new Date()) => {
  const simulation = getFlightSimulation(userFlight.flight, now);
  const guide = getPrimaryGuide(userFlight);

  return {
    id: userFlight.id,
    userId: userFlight.userId,
    flightId: userFlight.flightId,
    guideId: guide?.id ?? null,
    flight: {
      ...userFlight.flight,
      passcode: undefined,
      status: simulation.status,
      persisted_status: userFlight.flight.status,
      simulation,
    },
    checklistItems: formatChecklistItems(guide?.checklistItems ?? []),
  };
};

const getUserFlightInclude = {
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
  guides: {
    take: 1,
    orderBy: { guide_generation_time: "desc" },
    include: {
      checklistItems: {
        include: { template: true },
        orderBy: { due_time: "asc" },
      },
    },
  },
};

const getOwnedUserFlight = async (userFlightId, userId) =>
  prisma.userFlight.findFirst({
    where: { id: userFlightId, userId },
    include: getUserFlightInclude,
  });

const hydrateUserFlight = async (userFlightId, userId) => {
  let userFlight = await getOwnedUserFlight(userFlightId, userId);

  if (!userFlight) {
    return null;
  }

  await ensureGuideForUserFlight(userFlight);
  userFlight = await getOwnedUserFlight(userFlightId, userId);

  return userFlight;
};

const getChecklistResponse = async (userFlightId, userId) => {
  const userFlight = await hydrateUserFlight(userFlightId, userId);

  if (!userFlight) {
    return null;
  }

  const guide = getPrimaryGuide(userFlight);
  return {
    userFlightId,
    guideId: guide?.id ?? null,
    checklistItems: formatChecklistItems(guide?.checklistItems ?? []),
  };
};

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
          passcode: passcode.trim().toUpperCase(),
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

      let existing = await prisma.userFlight.findFirst({
        where: { userId, flightId: flight.id },
        include: getUserFlightInclude,
      });

      if (existing) {
        await ensureGuideForUserFlight(existing);
        existing = await getOwnedUserFlight(existing.id, userId);

        return res.status(200).json({
          status: true,
          alreadyRegistered: true,
          message: "You are already registered for this flight.",
          data: formatAssociationPayload(existing),
        });
      }

      const created = await prisma.$transaction(async (tx) => {
        const userFlight = await tx.userFlight.create({
          data: {
            userId,
            flightId: flight.id,
          },
          include: { flight: true },
        });

        await ensureGuideForUserFlight(userFlight, tx);

        return tx.userFlight.findUnique({
          where: { id: userFlight.id },
          include: getUserFlightInclude,
        });
      });

      return res.status(201).json({
        status: true,
        message: "Successfully associated with flight.",
        data: formatAssociationPayload(created),
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
        userId,
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
          include: getUserFlightInclude,
        }),
        prisma.userFlight.count({ where }),
      ]);

      for (const userFlight of userFlights) {
        await ensureGuideForUserFlight(userFlight);
      }

      const hydratedFlights = await prisma.userFlight.findMany({
        where: {
          id: { in: userFlights.map((userFlight) => userFlight.id) },
        },
        orderBy: {
          flight: {
            scheduled_departure_time: "asc",
          },
        },
        include: getUserFlightInclude,
      });

      const now = new Date();
      const data = hydratedFlights.map((userFlight) =>
        formatRegisteredFlight(userFlight, now),
      );

      return res.status(200).json({
        status: true,
        data,
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

  getChecklist: async (req, res) => {
    try {
      const checklist = await getChecklistResponse(
        req.params.userFlightId,
        req.user.id,
      );

      if (!checklist) {
        return res.status(404).json({
          status: false,
          message: "Flight association not found.",
        });
      }

      return res.status(200).json({
        status: true,
        data: checklist,
      });
    } catch (error) {
      console.error("getChecklist error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  updateChecklist: async (req, res) => {
    try {
      const { items } = req.body;
      const userFlight = await hydrateUserFlight(
        req.params.userFlightId,
        req.user.id,
      );

      if (!userFlight) {
        return res.status(404).json({
          status: false,
          message: "Flight association not found.",
        });
      }

      if (!Array.isArray(items)) {
        return res.status(400).json({
          status: false,
          message: "items must be an array of checklist state objects.",
        });
      }

      const guide = getPrimaryGuide(userFlight);
      const checklistItems = guide?.checklistItems ?? [];
      const stateById = new Map(
        items
          .filter((item) => typeof item?.id === "string")
          .map((item) => [item.id, Boolean(item.isCompleted)]),
      );

      const checklistUpdates = checklistItems
        .filter((item) => stateById.has(item.template?.item_type))
        .map((item) =>
          prisma.checkListItem.update({
            where: { id: item.id },
            data: {
              is_completed: stateById.get(item.template.item_type),
            },
          }),
        );

      if (checklistUpdates.length > 0) {
        await prisma.$transaction(checklistUpdates);
      }

      const checklist = await getChecklistResponse(userFlight.id, req.user.id);

      return res.status(200).json({
        status: true,
        message: "Checklist updated successfully.",
        data: checklist,
      });
    } catch (error) {
      console.error("updateChecklist error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },

  updateChecklistItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      const { isCompleted } = req.body;
      const userFlight = await hydrateUserFlight(
        req.params.userFlightId,
        req.user.id,
      );

      if (!userFlight) {
        return res.status(404).json({
          status: false,
          message: "Flight association not found.",
        });
      }

      if (typeof isCompleted !== "boolean") {
        return res.status(400).json({
          status: false,
          message: "isCompleted must be a boolean.",
        });
      }

      const guide = getPrimaryGuide(userFlight);
      const checklistItems = formatChecklistItems(guide?.checklistItems ?? []);
      const targetIndex = checklistItems.findIndex((item) => item.id === itemId);

      if (targetIndex < 0) {
        return res.status(404).json({
          status: false,
          message: "Checklist item not found.",
        });
      }

      if (
        isCompleted &&
        targetIndex > 0 &&
        !checklistItems[targetIndex - 1].isCompleted
      ) {
        return res.status(409).json({
          status: false,
          message: "Previous checklist item must be completed first.",
        });
      }

      const nextStates = checklistItems.map((item, index) => ({
        id: item.id,
        isCompleted: isCompleted
          ? item.isCompleted || item.id === itemId
          : index < targetIndex && item.isCompleted,
      }));

      req.body.items = nextStates;
      return flightController.updateChecklist(req, res);
    } catch (error) {
      console.error("updateChecklistItem error:", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  },
};

export default flightController;
