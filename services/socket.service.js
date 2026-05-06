let ioInstance = null;

export const getFlightRoomName = (flightId) => `flight:${flightId}`;

const buildAnonymousMessage = ({ flightId, message_text }) => ({
  id: `transient-${Date.now()}`,
  flightId,
  sender_type: "user",
  displayName: "Anonymous",
  message_text,
  sentAt: new Date().toISOString(),
  transient: true,
});

export const initializeSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("flight:join", ({ flightId, flight_id } = {}, ack) => {
      const roomFlightId = flightId || flight_id;
      if (!roomFlightId) {
        ack?.({ status: false, message: "flightId is required" });
        return;
      }

      socket.join(getFlightRoomName(roomFlightId));
      ack?.({ status: true, room: getFlightRoomName(roomFlightId) });
    });

    socket.on("flight:leave", ({ flightId, flight_id } = {}, ack) => {
      const roomFlightId = flightId || flight_id;
      if (!roomFlightId) {
        ack?.({ status: false, message: "flightId is required" });
        return;
      }

      socket.leave(getFlightRoomName(roomFlightId));
      ack?.({ status: true, room: getFlightRoomName(roomFlightId) });
    });

    socket.on("flight:message", (payload = {}, ack) => {
      const flightId = payload.flightId || payload.flight_id;
      const messageText = payload.message_text || payload.message;

      if (!flightId || !messageText?.trim()) {
        ack?.({
          status: false,
          message: "flightId and message_text are required",
        });
        return;
      }

      const message = buildAnonymousMessage({
        flightId,
        message_text: messageText.trim(),
      });

      io.to(getFlightRoomName(flightId)).emit("flight:message", message);
      ack?.({ status: true, data: message });
    });
  });

  return io;
};

export const emitSystemMessage = (flightId, update) => {
  if (!ioInstance || !flightId) {
    return null;
  }

  const message = {
    id: `system-${Date.now()}`,
    flightId,
    sender_type: "system",
    displayName: "Official Flight Update",
    message_text: update.message,
    sentAt: new Date().toISOString(),
    transient: true,
    official: true,
    update,
  };

  ioInstance
    .to(getFlightRoomName(flightId))
    .emit("flight:system-message", message);
  ioInstance.to(getFlightRoomName(flightId)).emit("flight:message", message);

  return message;
};

export const getSocketServer = () => ioInstance;
