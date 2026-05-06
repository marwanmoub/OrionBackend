-- Add user preference switch used by the geofencing dual-trigger flow.
ALTER TABLE "UserSettings" ADD COLUMN "automatedStateManagement" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "ChecklistTaskStatus" AS ENUM ('PENDING', 'COMPLETE');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "bookingReference" TEXT,
    "seatNumber" TEXT,
    "qrCodePayload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "userFlightId" TEXT,
    "guideId" TEXT,
    "title" TEXT NOT NULL,
    "itemType" TEXT,
    "checkListTemplateId" TEXT,
    "due_time" TIMESTAMP(3) NOT NULL,
    "dueOffsetMinutes" INTEGER,
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "status" "ChecklistTaskStatus" NOT NULL DEFAULT 'PENDING',
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "flightId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reaction_code" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'OneSignal',
    "providerMessageId" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ARMarker" (
    "id" TEXT NOT NULL,
    "flightId" TEXT,
    "checklistTaskId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "poiType" TEXT NOT NULL DEFAULT 'POI',
    "asset_url" TEXT,
    "asset_format" TEXT NOT NULL DEFAULT 'glb',
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,
    "posZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "reaction_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ARMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_userId_flightId_key" ON "Ticket"("userId", "flightId");

-- CreateIndex
CREATE INDEX "Ticket_flightId_idx" ON "Ticket"("flightId");

-- CreateIndex
CREATE INDEX "ChecklistTask_userId_flightId_status_idx" ON "ChecklistTask"("userId", "flightId", "status");

-- CreateIndex
CREATE INDEX "ChecklistTask_userFlightId_idx" ON "ChecklistTask"("userFlightId");

-- CreateIndex
CREATE INDEX "ChecklistTask_posX_posY_idx" ON "ChecklistTask"("posX", "posY");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_flightId_idx" ON "NotificationLog"("flightId");

-- CreateIndex
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ARMarker_slug_key" ON "ARMarker"("slug");

-- CreateIndex
CREATE INDEX "ARMarker_flightId_idx" ON "ARMarker"("flightId");

-- CreateIndex
CREATE INDEX "ARMarker_is_active_idx" ON "ARMarker"("is_active");

-- CreateIndex
CREATE INDEX "ARMarker_posX_posY_idx" ON "ARMarker"("posX", "posY");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTask" ADD CONSTRAINT "ChecklistTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTask" ADD CONSTRAINT "ChecklistTask_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTask" ADD CONSTRAINT "ChecklistTask_userFlightId_fkey" FOREIGN KEY ("userFlightId") REFERENCES "UserFlight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTask" ADD CONSTRAINT "ChecklistTask_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTask" ADD CONSTRAINT "ChecklistTask_checkListTemplateId_fkey" FOREIGN KEY ("checkListTemplateId") REFERENCES "CheckListTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARMarker" ADD CONSTRAINT "ARMarker_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARMarker" ADD CONSTRAINT "ARMarker_checklistTaskId_fkey" FOREIGN KEY ("checklistTaskId") REFERENCES "ChecklistTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
