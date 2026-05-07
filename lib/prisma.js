import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import generatedPrisma from "../generated/prisma/client.js";

const { PrismaClient } = generatedPrisma;

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
