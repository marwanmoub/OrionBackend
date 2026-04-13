import express from "express";
import authRouter from "./routes/auth.routes";

const app = express();
const PORT = 3000;

app.use(express.json());

//ROUTES
app.use("/auth", authRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
