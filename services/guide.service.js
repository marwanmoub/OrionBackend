/**
 * services/guide.service.js
 *
 * Core logic for POST /guide/generate.
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import prisma from "../lib/prisma.js";
import { extractAirportCoords, haversineDistanceKm } from "../utils/geo.utils.js";
import { subtractMinutes, addMinutes } from "../utils/time.utils.js";
import { scheduleTaskAlert } from "./guideNotificationScheduler.service.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const IN_AIRPORT_PROCESSING_MINUTES = 150;
const CONTINGENCY_BUFFER_MINUTES = 45;
const AVERAGE_SPEED_KMH = 55;
const MIN_ROUTE_MINUTES = 20;
const FALLBACK_ROUTE_MINUTES = 60;

// ─── First-time traveler guide (loaded once) ──────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firstTimeGuideRaw = fs.readFileSync(
  path.join(__dirname, "../data/airportFirstTimeGuide.json"),
  "utf8"
);
const firstTimeGuide = JSON.parse(firstTimeGuideRaw);

// ─── Task definitions ─────────────────────────────────────────────────────────
/**
 * Build the ordered list of ChecklistTask definitions.
 *
 * @param {{
 *   effectiveDepartureTime: Date,
 *   departureFromHomeAt: Date,
 *   estimatedRouteMinutes: number,
 *   originLat: number,
 *   originLng: number,
 * }} timing
 */
function buildTaskDefinitions({
  effectiveDepartureTime,
  departureFromHomeAt,
  estimatedRouteMinutes,
  originLat,
  originLng,
}) {
  const dep = effectiveDepartureTime;

  // Helper: minutes before effective departure → absolute Date
  const minsBeforeDep = (m) => subtractMinutes(dep, m);
  // Helper: offset from departureFromHomeAt
  const fromHome = (mins) => addMinutes(departureFromHomeAt, mins);

  return [
    // ── Home / pre-flight ────────────────────────────────────────────────────
    {
      itemType: "HOME_01_PACK_DOCUMENTS",
      title: "Pack travel documents",
      due_time: departureFromHomeAt, // start packing now
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES +
        CONTINGENCY_BUFFER_MINUTES +
        estimatedRouteMinutes,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },
    {
      itemType: "HOME_02_CHECK_PASSPORT",
      title: "Check passport / ID",
      due_time: fromHome(10),
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES +
        CONTINGENCY_BUFFER_MINUTES +
        estimatedRouteMinutes -
        10,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },
    {
      itemType: "HOME_03_CHECK_BAGGAGE",
      title: "Check baggage weight",
      due_time: fromHome(20),
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES +
        CONTINGENCY_BUFFER_MINUTES +
        estimatedRouteMinutes -
        20,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },
    {
      itemType: "HOME_04_CHARGE_PHONE",
      title: "Charge phone and prepare power bank",
      due_time: fromHome(30),
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES +
        CONTINGENCY_BUFFER_MINUTES +
        estimatedRouteMinutes -
        30,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },
    {
      itemType: "HOME_05_LEAVE_HOME",
      title: "Leave home for the airport",
      due_time: departureFromHomeAt,
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES +
        CONTINGENCY_BUFFER_MINUTES +
        estimatedRouteMinutes,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },

    // ── Route ────────────────────────────────────────────────────────────────
    {
      itemType: "ROUTE_01_START_ROUTE",
      title: "Start route to airport",
      due_time: departureFromHomeAt,
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES +
        CONTINGENCY_BUFFER_MINUTES +
        estimatedRouteMinutes,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },
    {
      itemType: "ROUTE_02_ARRIVE_NEAR_AIRPORT",
      title: "Arrive near airport",
      due_time: addMinutes(departureFromHomeAt, estimatedRouteMinutes),
      dueOffsetMinutes:
        IN_AIRPORT_PROCESSING_MINUTES + CONTINGENCY_BUFFER_MINUTES,
      posX: originLng,
      posY: originLat,
      radiusMeters: 50,
    },

    // ── Airport – mandatory ordered ──────────────────────────────────────────
    {
      itemType: "AIRPORT_01_ENTER_TERMINAL",
      title: "Enter airport / correct terminal",
      due_time: minsBeforeDep(150),
      dueOffsetMinutes: 150,
      posX: 0,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_02_CHECK_IN",
      title: "Go to check-in counter",
      due_time: minsBeforeDep(140),
      dueOffsetMinutes: 140,
      posX: 10,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_03_DROP_BAGGAGE",
      title: "Drop baggage if needed",
      due_time: minsBeforeDep(125),
      dueOffsetMinutes: 125,
      posX: 20,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_04_SECURITY",
      title: "Clear departure security",
      due_time: minsBeforeDep(110),
      dueOffsetMinutes: 110,
      posX: 30,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_05_PASSPORT_CONTROL",
      title: "Clear passport control",
      due_time: minsBeforeDep(90),
      dueOffsetMinutes: 90,
      posX: 40,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_06_GO_TO_GATE_AREA",
      title: "Go to concourse / gate area",
      due_time: minsBeforeDep(65),
      dueOffsetMinutes: 65,
      posX: 50,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_07_WAIT_AT_GATE",
      title: "Wait at assigned gate",
      due_time: minsBeforeDep(45),
      dueOffsetMinutes: 45,
      posX: 60,
      posY: 0,
      radiusMeters: 25,
    },
    {
      itemType: "AIRPORT_08_BOARDING",
      title: "Boarding",
      due_time: minsBeforeDep(30),
      dueOffsetMinutes: 30,
      posX: 70,
      posY: 0,
      radiusMeters: 25,
    },
  ];
}

// ─── Main service function ────────────────────────────────────────────────────
/**
 * Generate (or regenerate) a flight guide for a user.
 *
 * @param {string} userId
 * @param {{
 *   flightId: string,
 *   originLat: number,
 *   originLng: number,
 *   originAddress?: string,
 *   originPlaceId?: string,
 *   packingTimeMinutes?: number,
 *   isFirstTimeTraveler?: boolean,
 * }} body
 */
export async function generateGuide(userId, body) {
  // ── 1. Validate input ──────────────────────────────────────────────────────
  const { flightId, originAddress, originPlaceId } = body;

  const originLat = Number(body.originLat);
  const originLng = Number(body.originLng);
  const packingTimeMinutes =
    body.packingTimeMinutes != null ? Number(body.packingTimeMinutes) : 60;
  const isFirstTimeTraveler = Boolean(body.isFirstTimeTraveler ?? false);

  if (!flightId || isNaN(originLat) || isNaN(originLng)) {
    const err = new Error("flightId, originLat, and originLng are required.");
    err.status = 400;
    throw err;
  }

  // ── 2. Validate user flight ────────────────────────────────────────────────
  const userFlight = await prisma.userFlight.findFirst({
    where: { userId, flightId },
    include: {
      flight: {
        include: {
          departureAirport: true,
          arrivalAirport: true,
        },
      },
    },
  });

  if (!userFlight) {
    const err = new Error("Flight not found for this user.");
    err.status = 404;
    throw err;
  }

  const { flight } = userFlight;

  if (flight.is_cancelled) {
    const err = new Error("Cannot generate a guide for a cancelled flight.");
    err.status = 400;
    throw err;
  }

  // ── 3. Find ticket ────────────────────────────────────────────────────────
  const ticket = await prisma.ticket.findFirst({
    where: { userId, flightId },
  });

  // ── 4. Calculate timing ───────────────────────────────────────────────────
  const effectiveDepartureTime =
    flight.expected_departure_time ?? flight.scheduled_departure_time;

  // Route time from origin to departure airport
  const airportCoords = extractAirportCoords(flight.departureAirport.geo_json_data);

  let estimatedRouteMinutes = FALLBACK_ROUTE_MINUTES;

  if (airportCoords) {
    const distanceKm = haversineDistanceKm(
      originLat,
      originLng,
      airportCoords.lat,
      airportCoords.lng
    );
    const rawMinutes = (distanceKm / AVERAGE_SPEED_KMH) * 60;
    estimatedRouteMinutes = Math.max(MIN_ROUTE_MINUTES, Math.round(rawMinutes));
  }

  // departure_from_home_at = effectiveDeparture - route - airport processing - contingency - packing
  const departureFromHomeAt = subtractMinutes(
    effectiveDepartureTime,
    estimatedRouteMinutes +
      IN_AIRPORT_PROCESSING_MINUTES +
      CONTINGENCY_BUFFER_MINUTES +
      packingTimeMinutes
  );

  // Legacy Int field: total minutes before effective departure
  const departureFromHomeTime =
    estimatedRouteMinutes +
    IN_AIRPORT_PROCESSING_MINUTES +
    CONTINGENCY_BUFFER_MINUTES +
    packingTimeMinutes;

  // ── 5. Upsert Guide ───────────────────────────────────────────────────────
  const guideData = {
    flightId,
    userFlightId: userFlight.id,
    guide_generation_time: new Date(),
    origin_lat: originLat,
    origin_lng: originLng,
    origin_address: originAddress ?? null,
    origin_place_id: originPlaceId ?? null,
    used_airport_id: flight.departureAirport.id,
    departure_from_home_at: departureFromHomeAt,
    departure_from_home_time: departureFromHomeTime,
  };

  const guide = await prisma.guide.upsert({
    where: {
      flightId_userFlightId: {
        flightId,
        userFlightId: userFlight.id,
      },
    },
    create: guideData,
    update: guideData,
  });

  // ── 6. Create ChecklistTask records ───────────────────────────────────────
  // Delete existing PENDING tasks for this guide (keep COMPLETE ones)
  await prisma.checklistTask.deleteMany({
    where: {
      guideId: guide.id,
      status: "PENDING",
    },
  });

  const taskDefs = buildTaskDefinitions({
    effectiveDepartureTime,
    departureFromHomeAt,
    estimatedRouteMinutes,
    originLat,
    originLng,
  });

  const checklistTasks = await prisma.$transaction(
    taskDefs.map((def) =>
      prisma.checklistTask.create({
        data: {
          userId,
          flightId,
          userFlightId: userFlight.id,
          guideId: guide.id,
          title: def.title,
          itemType: def.itemType,
          due_time: def.due_time,
          dueOffsetMinutes: def.dueOffsetMinutes,
          posX: def.posX,
          posY: def.posY,
          radiusMeters: def.radiusMeters,
          status: "PENDING",
          alertSent: false,
        },
      })
    )
  );

  // ── 7. Schedule notifications ─────────────────────────────────────────────
  // Alert at departureFromHomeAt
  scheduleTaskAlert({
    id: checklistTasks.find((t) => t.itemType === "HOME_05_LEAVE_HOME")?.id ??
      checklistTasks[0].id,
    userId,
    flightId,
    title: "Time to leave for the airport",
    due_time: departureFromHomeAt,
  });

  // Alert for every task
  for (const task of checklistTasks) {
    if (task.due_time > new Date()) {
      scheduleTaskAlert({
        id: task.id,
        userId,
        flightId,
        title: task.title,
        due_time: task.due_time,
      });
    }
  }

  // ── 8. Build response ─────────────────────────────────────────────────────
  const { passcode: _p, ...flightDetails } = flight;

  return {
    guide,
    flight: flightDetails,
    ticket: ticket ?? null,
    timing: {
      effectiveDepartureTime: effectiveDepartureTime.toISOString(),
      estimatedRouteMinutes,
      packingTimeMinutes,
      inAirportProcessingMinutes: IN_AIRPORT_PROCESSING_MINUTES,
      contingencyBufferMinutes: CONTINGENCY_BUFFER_MINUTES,
      departureFromHomeAt: departureFromHomeAt.toISOString(),
    },
    checklistTasks,
    firstTimeTravelerGuide: isFirstTimeTraveler ? firstTimeGuide : null,
  };
}
