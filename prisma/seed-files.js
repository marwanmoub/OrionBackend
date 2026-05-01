/*
  Seed proof-of-concept flights, related airports, and mock AR camera models.

  Run from project root with:
    node prisma/seed-files.js

  Notes:
  - It upserts airports by iata_code.
  - It removes any existing flights with the same flight_number before inserting fresh samples.
  - It upserts AR models by slug so camera mock content can be safely refreshed.
*/

import prisma from "../lib/prisma.js";

const hoursFromNow = (hours) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const airports = [
  {
    iata_code: "BEY",
    name: "Beirut-Rafic Hariri International Airport",
    city: "Beirut",
    is_default: true,
  },
  {
    iata_code: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    is_default: false,
  },
  {
    iata_code: "DOH",
    name: "Hamad International Airport",
    city: "Doha",
    is_default: false,
  },
  {
    iata_code: "IST",
    name: "Istanbul Airport",
    city: "Istanbul",
    is_default: false,
  },
  {
    iata_code: "CDG",
    name: "Charles de Gaulle Airport",
    city: "Paris",
    is_default: false,
  },
  {
    iata_code: "LHR",
    name: "Heathrow Airport",
    city: "London",
    is_default: false,
  },
  {
    iata_code: "FRA",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    is_default: false,
  },
  {
    iata_code: "AMM",
    name: "Queen Alia International Airport",
    city: "Amman",
    is_default: false,
  },
  {
    iata_code: "CAI",
    name: "Cairo International Airport",
    city: "Cairo",
    is_default: false,
  },
  {
    iata_code: "RUH",
    name: "King Khalid International Airport",
    city: "Riyadh",
    is_default: false,
  },
  {
    iata_code: "JED",
    name: "King Abdulaziz International Airport",
    city: "Jeddah",
    is_default: false,
  },
];

const flightSamples = [
  {
    flight_number: "ME201",
    departure: "BEY",
    arrival: "DXB",
    scheduled_departure_time: hoursFromNow(6),
    expected_departure_time: hoursFromNow(6),
    gate: "A3",
    terminal: "1",
    status: "SCHEDULED",
    passcode: "BEYDXB201",
    is_cancelled: false,
  },
  {
    flight_number: "ME305",
    departure: "BEY",
    arrival: "DOH",
    scheduled_departure_time: hoursFromNow(0.5),
    expected_departure_time: hoursFromNow(0.5),
    gate: "B1",
    terminal: "1",
    status: "BOARDING",
    passcode: "BEYDOH305",
    is_cancelled: false,
  },
  {
    flight_number: "ME411",
    departure: "BEY",
    arrival: "IST",
    scheduled_departure_time: hoursFromNow(2),
    expected_departure_time: hoursFromNow(2.5),
    gate: "C7",
    terminal: "1",
    status: "DELAYED",
    passcode: "BEYIST411",
    is_cancelled: false,
  },
  {
    flight_number: "ME522",
    departure: "BEY",
    arrival: "CDG",
    scheduled_departure_time: hoursFromNow(26),
    expected_departure_time: hoursFromNow(26),
    gate: "D2",
    terminal: "1",
    status: "SCHEDULED",
    passcode: "BEYCDG522",
    is_cancelled: false,
  },
  {
    flight_number: "ME618",
    departure: "BEY",
    arrival: "LHR",
    scheduled_departure_time: hoursFromNow(30),
    expected_departure_time: hoursFromNow(30.33),
    gate: "A9",
    terminal: "1",
    status: "DELAYED",
    passcode: "BEYLHR618",
    is_cancelled: false,
  },
  {
    flight_number: "ME701",
    departure: "BEY",
    arrival: "FRA",
    scheduled_departure_time: hoursFromNow(34),
    expected_departure_time: hoursFromNow(34),
    gate: "B4",
    terminal: "1",
    status: "SCHEDULED",
    passcode: "BEYFRA701",
    is_cancelled: false,
  },
  {
    flight_number: "ME812",
    departure: "BEY",
    arrival: "AMM",
    scheduled_departure_time: hoursFromNow(0.2),
    expected_departure_time: hoursFromNow(0.2),
    gate: "C2",
    terminal: "1",
    status: "FINAL_CALL",
    passcode: "BEYAMM812",
    is_cancelled: false,
  },
  {
    flight_number: "ME904",
    departure: "BEY",
    arrival: "CAI",
    scheduled_departure_time: hoursFromNow(8),
    expected_departure_time: hoursFromNow(8),
    gate: "D5",
    terminal: "1",
    status: "SCHEDULED",
    passcode: "BEYCAI904",
    is_cancelled: false,
  },
  {
    flight_number: "ME101",
    departure: "BEY",
    arrival: "RUH",
    scheduled_departure_time: hoursFromNow(10),
    expected_departure_time: hoursFromNow(10.5),
    gate: "A5",
    terminal: "1",
    status: "DELAYED",
    passcode: "BEYRUH101",
    is_cancelled: false,
  },
  {
    flight_number: "ME119",
    departure: "BEY",
    arrival: "JED",
    scheduled_departure_time: hoursFromNow(12),
    expected_departure_time: hoursFromNow(12),
    gate: "B6",
    terminal: "1",
    status: "SCHEDULED",
    passcode: "BEYJED119",
    is_cancelled: false,
  },
  {
    flight_number: "EK958",
    departure: "DXB",
    arrival: "BEY",
    scheduled_departure_time: hoursFromNow(0.75),
    expected_departure_time: hoursFromNow(0.85),
    gate: "A1",
    terminal: "3",
    status: "BOARDING",
    passcode: "DXBBEY958",
    is_cancelled: false,
  },
  {
    flight_number: "QR418",
    departure: "DOH",
    arrival: "BEY",
    scheduled_departure_time: hoursFromNow(16),
    expected_departure_time: hoursFromNow(16),
    gate: "C9",
    terminal: "H1",
    status: "SCHEDULED",
    passcode: "DOHBEY418",
    is_cancelled: false,
  },
  {
    flight_number: "TK824",
    departure: "IST",
    arrival: "BEY",
    scheduled_departure_time: hoursFromNow(20),
    expected_departure_time: hoursFromNow(20.33),
    gate: "F3",
    terminal: "M",
    status: "DELAYED",
    passcode: "ISTBEY824",
    is_cancelled: false,
  },
  {
    flight_number: "AF566",
    departure: "CDG",
    arrival: "BEY",
    scheduled_departure_time: hoursFromNow(-3.5),
    expected_departure_time: hoursFromNow(-3.5),
    gate: "E8",
    terminal: "2E",
    status: "LANDED",
    passcode: "CDGBEY566",
    is_cancelled: false,
  },
  {
    flight_number: "SV640",
    departure: "JED",
    arrival: "BEY",
    scheduled_departure_time: hoursFromNow(24),
    expected_departure_time: hoursFromNow(24),
    gate: "G2",
    terminal: "1",
    status: "CANCELLED",
    passcode: "JEDBEY640",
    is_cancelled: true,
  },
];

const checklistTemplates = [
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

const arModelSamples = [
  {
    slug: "bey-gate-a3-beacon",
    name: "Gate A3 Boarding Beacon",
    description: "A floating boarding cue for the AR camera near Gate A3.",
    category: "WAYFINDING",
    asset_url:
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF-Binary/Lantern.glb",
    asset_format: "glb",
    latitude: 33.82093,
    longitude: 35.48839,
    altitude_meters: 8,
    position_x: 0,
    position_y: 0.5,
    position_z: -2.5,
    rotation_x: 0,
    rotation_y: 20,
    rotation_z: 0,
    scale: 0.65,
    is_active: true,
  },
  {
    slug: "bey-security-fast-track",
    name: "Security Fast Track Guide",
    description: "A mock guide model that points travelers toward security.",
    category: "INFO",
    asset_url:
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
    asset_format: "glb",
    latitude: 33.82058,
    longitude: 35.48892,
    altitude_meters: 7,
    position_x: -1.2,
    position_y: 0.25,
    position_z: -3.2,
    rotation_x: 0,
    rotation_y: -35,
    rotation_z: 0,
    scale: 0.45,
    is_active: true,
  },
  {
    slug: "bey-baggage-claim-helper",
    name: "Baggage Claim Helper",
    description: "A mock AR model for baggage claim orientation.",
    category: "SERVICE",
    asset_url:
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb",
    asset_format: "glb",
    latitude: 33.82125,
    longitude: 35.48786,
    altitude_meters: 5,
    position_x: 1.4,
    position_y: 0.2,
    position_z: -2.8,
    rotation_x: 0,
    rotation_y: 12,
    rotation_z: 0,
    scale: 0.35,
    is_active: true,
  },
];

async function upsertAirports() {
  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { iata_code: airport.iata_code },
      update: {
        name: airport.name,
        city: airport.city,
        is_default: airport.is_default,
      },
      create: {
        ...airport,
        geo_json_data: null,
      },
    });
  }

  return prisma.airport.findMany({
    where: { iata_code: { in: airports.map((a) => a.iata_code) } },
    select: { id: true, iata_code: true },
  });
}

async function seedFlights() {
  const airportRows = await upsertAirports();
  const airportIdByCode = Object.fromEntries(
    airportRows.map((a) => [a.iata_code, a.id]),
  );

  for (const flight of flightSamples) {
    const data = {
      flight_number: flight.flight_number,
      departure_airport_id: airportIdByCode[flight.departure],
      arrival_airport_id: airportIdByCode[flight.arrival],
      scheduled_departure_time: new Date(flight.scheduled_departure_time),
      expected_departure_time: new Date(flight.expected_departure_time),
      gate: flight.gate,
      terminal: flight.terminal,
      status: flight.status,
      passcode: flight.passcode,
      is_cancelled: flight.is_cancelled,
    };

    await prisma.flight.upsert({
      where: { flight_number: flight.flight_number },
      update: {
        departure_airport_id: data.departure_airport_id,
        arrival_airport_id: data.arrival_airport_id,
        scheduled_departure_time: data.scheduled_departure_time,
        expected_departure_time: data.expected_departure_time,
        gate: data.gate,
        terminal: data.terminal,
        status: data.status,
        passcode: data.passcode,
        is_cancelled: data.is_cancelled,
      },
      create: data,
    });
  }

  const inserted = await prisma.flight.findMany({
    where: { flight_number: { in: flightSamples.map((f) => f.flight_number) } },
    include: {
      departureAirport: { select: { iata_code: true, city: true } },
      arrivalAirport: { select: { iata_code: true, city: true } },
    },
    orderBy: { scheduled_departure_time: "asc" },
  });

  console.log(`Seeded ${inserted.length} flights.`);
  console.table(
    inserted.map((f) => ({
      flight_number: f.flight_number,
      from: f.departureAirport.iata_code,
      to: f.arrivalAirport.iata_code,
      status: f.status,
      passcode: f.passcode,
      is_cancelled: f.is_cancelled,
    })),
  );
}

async function seedChecklistTemplates() {
  for (const template of checklistTemplates) {
    await prisma.checkListTemplate.upsert({
      where: { item_type: template.item_type },
      update: template,
      create: template,
    });
  }

  const inserted = await prisma.checkListTemplate.findMany({
    where: {
      item_type: { in: checklistTemplates.map((item) => item.item_type) },
    },
    orderBy: { default_due_offset_hours: "asc" },
  });

  console.log(`Seeded ${inserted.length} checklist templates.`);
  console.table(
    inserted.map((template) => ({
      item_type: template.item_type,
      taskName: template.taskName,
      default_due_offset_hours: template.default_due_offset_hours,
      is_mandatory: template.is_mandatory,
    })),
  );
}

async function seedARModels() {
  for (const model of arModelSamples) {
    await prisma.arModel.upsert({
      where: { slug: model.slug },
      update: model,
      create: model,
    });
  }

  const inserted = await prisma.arModel.findMany({
    where: { slug: { in: arModelSamples.map((model) => model.slug) } },
    orderBy: { name: "asc" },
  });

  console.log(`Seeded ${inserted.length} AR models.`);
  console.table(
    inserted.map((model) => ({
      slug: model.slug,
      name: model.name,
      category: model.category,
      latitude: model.latitude,
      longitude: model.longitude,
      scale: model.scale,
    })),
  );
}

async function main() {
  await seedChecklistTemplates();
  await seedFlights();
  await seedARModels();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
