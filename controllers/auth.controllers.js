import prisma from "/lib/prisma.ts";
import argon2 from "argon2";

const authController = {
  login: async (req, res) => {
    try {
      let { email, phone, password } = req.body;

      let userFromDB = prisma.users.findUnique({
        where: {
          email: email,
        },
      });
      if (!userFromDB) {
        userFromDB = prisma.users.findUnique({
          where: {
            phone: phone,
          },
        });
      }
      if (!userFromDB) {
        return res.status(404).send("User not found");
      }
      const isValid = await argon2.verify(userFromDB.password, password);
      if (!isValid) return res.status(401).json({ error: "Wrong Password" });
      const token = jwt.sign({ userId: user.id }, "Allah_y5lilna_ye@bau$$", {
        expiresIn: "1h",
      });

      res.json({
        message: "Login successful",
        token: token,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },

  signUp: async (req, res) => {
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
        return res.status(400).json({
          message: "Failed to create user",
        });
      }

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
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },
};

export default authController;
