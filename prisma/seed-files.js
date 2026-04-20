/*
  Seed 15 proof-of-concept flights + related airports.

  Run from project root with one of:
    node prisma/seedFlights.js
    node seed-flights.js

  Notes:
  - This script tries your generated Prisma client first, then falls back to @prisma/client.
  - It upserts airports by iata_code.
  - It removes any existing flights with the same flight_number before inserting fresh samples.
*/

let PrismaClient;
try {
  ({ PrismaClient } = require("./generated/prisma"));
} catch (e1) {
  try {
    ({ PrismaClient } = require("../generated/prisma"));
  } catch (e2) {
    ({ PrismaClient } = require("@prisma/client"));
  }
}

const prisma = new PrismaClient();

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
    scheduled_departure_time: "2026-04-21T05:30:00.000Z",
    expected_departure_time: "2026-04-21T05:45:00.000Z",
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
    scheduled_departure_time: "2026-04-21T09:10:00.000Z",
    expected_departure_time: "2026-04-21T09:10:00.000Z",
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
    scheduled_departure_time: "2026-04-21T12:25:00.000Z",
    expected_departure_time: "2026-04-21T13:00:00.000Z",
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
    scheduled_departure_time: "2026-04-22T06:40:00.000Z",
    expected_departure_time: "2026-04-22T06:40:00.000Z",
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
    scheduled_departure_time: "2026-04-22T10:15:00.000Z",
    expected_departure_time: "2026-04-22T10:35:00.000Z",
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
    scheduled_departure_time: "2026-04-22T14:20:00.000Z",
    expected_departure_time: "2026-04-22T14:20:00.000Z",
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
    scheduled_departure_time: "2026-04-23T07:00:00.000Z",
    expected_departure_time: "2026-04-23T07:05:00.000Z",
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
    scheduled_departure_time: "2026-04-23T11:50:00.000Z",
    expected_departure_time: "2026-04-23T11:50:00.000Z",
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
    scheduled_departure_time: "2026-04-23T15:45:00.000Z",
    expected_departure_time: "2026-04-23T16:10:00.000Z",
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
    scheduled_departure_time: "2026-04-24T04:55:00.000Z",
    expected_departure_time: "2026-04-24T04:55:00.000Z",
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
    scheduled_departure_time: "2026-04-24T08:35:00.000Z",
    expected_departure_time: "2026-04-24T08:45:00.000Z",
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
    scheduled_departure_time: "2026-04-24T12:20:00.000Z",
    expected_departure_time: "2026-04-24T12:20:00.000Z",
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
    scheduled_departure_time: "2026-04-25T09:40:00.000Z",
    expected_departure_time: "2026-04-25T10:00:00.000Z",
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
    scheduled_departure_time: "2026-04-25T13:10:00.000Z",
    expected_departure_time: "2026-04-25T13:10:00.000Z",
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
    scheduled_departure_time: "2026-04-25T18:25:00.000Z",
    expected_departure_time: "2026-04-25T18:25:00.000Z",
    gate: "G2",
    terminal: "1",
    status: "CANCELLED",
    passcode: "JEDBEY640",
    is_cancelled: true,
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

  await prisma.flight.deleteMany({
    where: {
      flight_number: {
        in: flightSamples.map((f) => f.flight_number),
      },
    },
  });

  for (const flight of flightSamples) {
    await prisma.flight.create({
      data: {
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
      },
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

seedFlights()
  .catch((error) => {
    console.error("Flight seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
