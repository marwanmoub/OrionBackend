import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import prisma from "../lib/prisma.js";
import argon2 from "argon2";

const authController = {
  login: async (req, res) => {
    try {
      let { email, phone, password } = req.body;

      let user;
      if (email) {
        user = prisma.user.findUnique({
          where: {
            email: email,
          },
        });
      }

      if (phone) {
        user = prisma.user.findUnique({
          where: {
            phone: phone,
          },
        });
      }

      if (!user) {
        return res.status(400).send("User not found");
      }

      const isValid = await argon2.verify(userFromDB.password, password);

      if (!isValid) return res.status(401).json({ error: "Wrong Password" });

      const accessToken = generateAccessToken();
      const refreshToken = generateRefreshToken();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
        },
      });

      res.status(201).json({
        message: "Login successful",
        accessToken: accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },

  signUp: async (req, res) => {
    console.log("here");
    try {
      let { fullName, email, phone, password } = req.body;
      const hashedPassword = await argon2.hash(password);

      const userProperties = {
        fullName,
        password: hashedPassword,
      };

      if (email) {
        userProperties.email = email;
      }

      if (phone) {
        userProperties.phone = phone;
      }

      const createUser = await prisma.user.create({
        data: userProperties,
      });

      if (!createUser) {
        console.log("failed");
        return res.status(400).json({
          message: "Failed to create user",
        });
      }

      console.log(createUser);
      return res.status(201).json({
        message: "User created successfully",
        user: {
          id: createUser.id,
          fullName: createUser.fullName,
          email: createUser.email,
          phone: createUser.phone,
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Email or phone already exists" });
      }

      console.error(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
};

export default authController;
