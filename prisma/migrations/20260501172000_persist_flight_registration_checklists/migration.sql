-- Keep seeded flights and user registrations stable across repeated seeding.
CREATE UNIQUE INDEX "Flight_flight_number_key" ON "Flight"("flight_number");
CREATE UNIQUE INDEX "UserFlight_userId_flightId_key" ON "UserFlight"("userId", "flightId");

-- Checklist templates are addressed by the mobile journey item id.
CREATE UNIQUE INDEX "CheckListTemplate_item_type_key" ON "CheckListTemplate"("item_type");
