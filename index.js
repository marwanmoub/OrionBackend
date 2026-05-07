import express from "express";
import http from "http";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/users.routes.js";
import chatRouter from "./routes/chat.routes.js";
import guideRouter from "./routes/guide.routes.js";
import prisma from "./lib/prisma.js";
import { sendAccDeletedFinal } from "./utils/emailSender.js";
import cron from "node-cron";
import flightRouter from "./routes/flight.routes.js";
import mapRouter from "./routes/map.routes.js";
import staticRouter from "./routes/static.routes.js";

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

//ROUTES
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/chat", chatRouter);
app.use("/flight", flightRouter);
app.use("/api/map", mapRouter);
app.use("/static", staticRouter);
app.use("/api/static", staticRouter);
app.use("/guide", guideRouter);

// This runs every hour (0 * * * *)
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly account deletion sweep...");

  const now = new Date();
  const expiredAccounts = await prisma.user.findMany({
    where: {
      deletion_requested_at: { lte: now },
    },
  });

  for (const user of expiredAccounts) {
    await prisma.user.delete({ where: { id: user.id } });
    await sendAccDeletedFinal(user.email);
    console.log(`Deleted user: ${user.id}`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
