import prisma from "../lib/prisma.js";
import { sendOneSignalNotification } from "../utils/notifications.js";

const DEFAULT_RADIUS_METERS = 250;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return number;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const calculateLocalDistance = (x1, y1, x2, y2) =>
  Math.hypot(Number(x2) - Number(x1), Number(y2) - Number(y1));

export const hasEnteredPoiZone = ({ x, y }, poi) =>
  calculateLocalDistance(x, y, poi.posX, poi.posY) <=
  (poi.radiusMeters ?? 5);

const isAutomatedStateManagementEnabled = (settings) =>
  Boolean(
    settings?.automatedStateManagement ||
      settings?.change_user_state_automatically,
  );

function formatARModel(model, distanceMeters = null) {
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    description: model.description,
    category: model.category,
    asset: {
      url: model.asset_url,
      format: model.asset_format,
    },
    anchor: {
      latitude: model.latitude,
      longitude: model.longitude,
      altitudeMeters: model.altitude_meters,
    },
    transform: {
      position: {
        x: model.position_x,
        y: model.position_y,
        z: model.position_z,
      },
      rotation: {
        x: model.rotation_x,
        y: model.rotation_y,
        z: model.rotation_z,
      },
      scale: model.scale,
    },
    isActive: model.is_active,
    ...(distanceMeters !== null && {
      distanceMeters: Math.round(distanceMeters * 100) / 100,
    }),
  };
}

const formatChecklistTask = (task, distanceMeters = null) => ({
  id: task.id,
  title: task.title,
  itemType: task.itemType,
  dueTime: task.due_time.toISOString(),
  due_time: task.due_time.toISOString(),
  dueOffsetMinutes: task.dueOffsetMinutes,
  posX: task.posX,
  posY: task.posY,
  radiusMeters: task.radiusMeters,
  status: task.status,
  completedAt: task.completedAt?.toISOString() ?? null,
  ...(distanceMeters !== null && {
    distanceMeters: Math.round(distanceMeters * 100) / 100,
  }),
});

const syncLegacyChecklistItem = async (task) => {
  if (!task.guideId || !task.itemType) {
    return;
  }

  const checklistItem = await prisma.checkListItem.findFirst({
    where: {
      guideId: task.guideId,
      template: {
        item_type: task.itemType,
      },
    },
    select: { id: true },
  });

  if (!checklistItem) {
    return;
  }

  await prisma.checkListItem.update({
    where: { id: checklistItem.id },
    data: { is_completed: true },
  });
};

const mapController = {
  getARModels: async (req, res) => {
    try {
      const latitude = parseNumber(req.query.latitude, "latitude");
      const longitude = parseNumber(req.query.longitude, "longitude");
      const radiusMeters =
        parseNumber(req.query.radiusMeters, "radiusMeters") ??
        DEFAULT_RADIUS_METERS;
      const requestedLimit = parseNumber(req.query.limit, "limit");
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, Math.floor(requestedLimit ?? DEFAULT_LIMIT)),
      );

      if ((latitude === null) !== (longitude === null)) {
        return res.status(400).json({
          status: false,
          message: "latitude and longitude must be provided together",
        });
      }

      if (latitude !== null && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({
          status: false,
          message: "latitude must be between -90 and 90",
        });
      }

      if (longitude !== null && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({
          status: false,
          message: "longitude must be between -180 and 180",
        });
      }

      if (radiusMeters <= 0) {
        return res.status(400).json({
          status: false,
          message: "radiusMeters must be greater than 0",
        });
      }

      const arModels = await prisma.arModel.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
      });

      const data = arModels
        .map((model) => {
          const distanceMeters =
            latitude !== null
              ? calculateDistanceMeters(
                  latitude,
                  longitude,
                  model.latitude,
                  model.longitude,
                )
              : null;

          return { model, distanceMeters };
        })
        .filter(
          ({ distanceMeters }) =>
            distanceMeters === null || distanceMeters <= radiusMeters,
        )
        .sort((a, b) => {
          if (a.distanceMeters === null || b.distanceMeters === null) return 0;
          return a.distanceMeters - b.distanceMeters;
        })
        .slice(0, limit)
        .map(({ model, distanceMeters }) =>
          formatARModel(model, distanceMeters),
        );

      return res.status(200).json({
        status: true,
        message: "AR models retrieved successfully",
        data,
      });
    } catch (error) {
      if (error.message?.includes("must be a valid number")) {
        return res.status(400).json({
          status: false,
          message: error.message,
        });
      }

      console.error("getARModels error:", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },

  boundaryCrossing: async (req, res) => {
    try {
      const userId = req.user.id;
      const x = parseNumber(req.body.x ?? req.body.posX, "x");
      const y = parseNumber(req.body.y ?? req.body.posY, "y");
      const { flightId, userFlightId, taskId } = req.body;

      if (x === null || y === null) {
        return res.status(400).json({
          status: false,
          message: "x and y are required local coordinates.",
        });
      }

      const [settings, pendingTasks] = await prisma.$transaction([
        prisma.userSettings.findUnique({ where: { userId } }),
        prisma.checklistTask.findMany({
          where: {
            userId,
            status: "PENDING",
            ...(taskId && { id: taskId }),
            ...(flightId && { flightId }),
            ...(userFlightId && { userFlightId }),
          },
          include: {
            flight: {
              select: {
                id: true,
                flight_number: true,
              },
            },
          },
          orderBy: { due_time: "asc" },
        }),
      ]);

      const entered = pendingTasks
        .map((task) => ({
          task,
          distanceMeters: calculateLocalDistance(x, y, task.posX, task.posY),
        }))
        .filter(({ task, distanceMeters }) => distanceMeters <= task.radiusMeters)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

      if (!entered) {
        return res.status(200).json({
          status: true,
          entered: false,
          message: "No POI boundary was crossed for a pending task.",
        });
      }

      const automated = isAutomatedStateManagementEnabled(settings);

      if (automated) {
        const updatedTask = await prisma.checklistTask.update({
          where: { id: entered.task.id },
          data: {
            status: "COMPLETE",
            completedAt: new Date(),
          },
        });

        await syncLegacyChecklistItem(updatedTask);

        await sendOneSignalNotification({
          userId,
          flightId: updatedTask.flightId,
          type: "Normal",
          title: "Journey Task Complete",
          message: `${updatedTask.title} was completed automatically.`,
          reaction_code: "POSITIVE",
          voiceScript: `${updatedTask.title} is complete.`,
          deepLinkAction: `orion://checklist/${updatedTask.id}`,
          data: {
            event: "CHECKLIST_TASK_AUTO_COMPLETED",
            taskId: updatedTask.id,
          },
        });

        return res.status(200).json({
          status: true,
          entered: true,
          action: "COMPLETED",
          automatedStateManagement: true,
          data: formatChecklistTask(updatedTask, entered.distanceMeters),
        });
      }

      await sendOneSignalNotification({
        userId,
        flightId: entered.task.flightId,
        type: "Normal",
        title: "Confirm Journey Task",
        message: `It looks like you reached ${entered.task.title}. Mark it complete?`,
        reaction_code: "PROMPT",
        voiceScript: `It looks like you reached ${entered.task.title}. Would you like to mark it complete?`,
        deepLinkAction: `orion://checklist/${entered.task.id}/confirm`,
        data: {
          event: "CHECKLIST_TASK_CONFIRMATION_REQUIRED",
          taskId: entered.task.id,
        },
      });

      return res.status(200).json({
        status: true,
        entered: true,
        action: "PROMPTED",
        automatedStateManagement: false,
        data: formatChecklistTask(entered.task, entered.distanceMeters),
      });
    } catch (error) {
      if (error.message?.includes("must be a valid number")) {
        return res.status(400).json({
          status: false,
          message: error.message,
        });
      }

      console.error("boundaryCrossing error:", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  },
};

export default mapController;
