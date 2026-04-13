import prisma from "/lib/prisma.ts";

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
      let { email, password } = req.body;

      let userFromDB = prisma.users.findUnique({
        where: {
          email: email,
        },
      }); // TODO: Fix table name
      if (userFromDB) {
        return res.status(400).send("Email already exists");
      }
      const hashedPassword = await argon2.hash(password);
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
};

export default authController;
