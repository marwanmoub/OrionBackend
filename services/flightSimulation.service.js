import prisma from "../lib/prisma.js";
import { emitSystemMessage } from "./socket.service.js";
import { sendOneSignalNotification } from "../utils/notifications.js";
import { handleFlightDelayContextualAlert } from "../utils/nova.js";

const getDepartureTime = (flight) =>
  flight.expected_departure_time ?? flight.scheduled_departure_time;

const getCurrentDelayMinutes = (flight) =>
  Math.max(
    0,
    Math.round(
      (getDepartureTime(flight).getTime() -
        flight.scheduled_departure_time.getTime()) /
        60000,
    ),
  );

const toNonNegativeNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${fieldName} must be a non-negative number`);
    error.statusCode = 400;
    throw error;
  }

  return number;
};

const refreshChecklistTaskDueTimes = async (flight) => {
  const departureTime = getDepartureTime(flight);
  const pendingTasks = await prisma.checklistTask.findMany({
    where: {
      flightId: flight.id,
      status: "PENDING",
      dueOffsetMinutes: { not: null },
    },
    select: {
      id: true,
      dueOffsetMinutes: true,
    },
  });

  if (pendingTasks.length === 0) {
    return;
  }

  await prisma.$transaction(
    pendingTasks.map((task) =>
      prisma.checklistTask.update({
        where: { id: task.id },
        data: {
          due_time: new Date(
            departureTime.getTime() + task.dueOffsetMinutes * 60 * 1000,
          ),
        },
      }),
    ),
  );
};

const buildOfficialUpdateMessage = ({ flight, gateChanged, delayChanged }) => {
  const updates = [];

  if (gateChanged) {
    updates.push(`gate changed to ${flight.gate}`);
  }

  if (delayChanged) {
    const delayMinutes = getCurrentDelayMinutes(flight);
    updates.push(
      delayMinutes > 0
        ? `departure delayed by ${delayMinutes} minutes`
        : "departure returned to the scheduled time",
    );
  }

  if (updates.length === 0) {
    updates.push(`status updated to ${flight.status}`);
  }

  return `${flight.flight_number}: ${updates.join("; ")}.`;
};

export const simulateFlightUpdate = async ({
  flightId,
  flight_number,
  gate,
  delayMinutes,
  addDelayMinutes,
  status,
}) => {
  if (!flightId && !flight_number) {
    const error = new Error("flightId or flight_number is required");
    error.statusCode = 400;
    throw error;
  }

  const flight = await prisma.flight.findFirst({
    where: flightId
      ? { id: flightId }
      : { flight_number: flight_number?.trim().toUpperCase() },
  });

  if (!flight) {
    const error = new Error("Flight not found");
    error.statusCode = 404;
    throw error;
  }

  const currentDelayMinutes = getCurrentDelayMinutes(flight);
  const explicitDelayMinutes = toNonNegativeNumber(
    delayMinutes,
    "delayMinutes",
  );
  const incrementalDelayMinutes = toNonNegativeNumber(
    addDelayMinutes,
    "addDelayMinutes",
  );
  const nextDelayMinutes =
    explicitDelayMinutes ??
    (incrementalDelayMinutes !== null
      ? currentDelayMinutes + incrementalDelayMinutes
      : null);

  const data = {};
  const gateChanged = gate !== undefined && gate !== flight.gate;
  const delayChanged =
    nextDelayMinutes !== null && nextDelayMinutes !== currentDelayMinutes;

  if (gateChanged) {
    data.gate = String(gate).trim().toUpperCase();
  }

  if (delayChanged) {
    data.expected_departure_time = new Date(
      flight.scheduled_departure_time.getTime() + nextDelayMinutes * 60 * 1000,
    );
    data.status = nextDelayMinutes > 0 ? "DELAYED" : status ?? "SCHEDULED";
  }

  if (status && !delayChanged) {
    data.status = String(status).trim().toUpperCase();
  }

  if (Object.keys(data).length === 0) {
    return {
      changed: false,
      flight,
      systemMessage: null,
      notifiedUsers: 0,
    };
  }

  const updatedFlight = await prisma.flight.update({
    where: { id: flight.id },
    data,
  });

  if (delayChanged) {
    await refreshChecklistTaskDueTimes(updatedFlight);
  }

  const message = buildOfficialUpdateMessage({
    flight: updatedFlight,
    gateChanged,
    delayChanged,
  });
  const systemMessage = emitSystemMessage(updatedFlight.id, {
    type: "OFFICIAL_FLIGHT_UPDATE",
    flightId: updatedFlight.id,
    flight_number: updatedFlight.flight_number,
    gate: updatedFlight.gate,
    status: updatedFlight.status,
    delayMinutes: getCurrentDelayMinutes(updatedFlight),
    message,
  });

  const userFlights = await prisma.userFlight.findMany({
    where: { flightId: updatedFlight.id },
    select: { userId: true },
  });
  const updatedDelayMinutes = getCurrentDelayMinutes(updatedFlight);

  await Promise.all(
    userFlights.map(({ userId }) =>
      delayChanged && updatedDelayMinutes > 0
        ? handleFlightDelayContextualAlert({
            userId,
            flight: updatedFlight,
            delayMinutes: updatedDelayMinutes,
          })
        : sendOneSignalNotification({
            userId,
            flightId: updatedFlight.id,
            type: "Normal",
            title: "Official Flight Update",
            message,
            reaction_code: "ATTENTIVE",
            voiceScript: message,
            deepLinkAction: `orion://flight/${updatedFlight.id}`,
            data: {
              event: "FLIGHT_UPDATE_SIMULATED",
              flightNumber: updatedFlight.flight_number,
            },
          }),
    ),
  );

  return {
    changed: true,
    flight: updatedFlight,
    systemMessage,
    notifiedUsers: userFlights.length,
  };
};
