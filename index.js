import express from "express";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/users.routes.js";
import chatRouter from "./routes/chat.routes.js";

const app = express();
const PORT = 3005;

app.use(express.json());

//ROUTES
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/chat", chatRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
