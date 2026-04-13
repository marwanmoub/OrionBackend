import express from "express";
import { argon2 } from "argon2";
import jwt from "jwt";
import { PrismaClient } from "@prisma/client/extension";
import authRouter from "./routes/auth.routes";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

const router = express.router();

app.use(express.json());

//ROUTES
app.use("/auth", authRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
