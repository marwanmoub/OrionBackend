import express from "express";
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/Login",async (req, res) => {
  try{
  let {email,phone, password} = req.body;
  
  let userFromDB = prisma.users.findUnique({
    where: {
      email: email, 
    }
  });  // TODO: Fix table name]
  if(!userFromDB){
   userFromDB = prisma.users.findUnique({
      where: {
        phone: phone, 
      }
    });  
  }
  if(!userFromDB){
    return res.status(404).send("User not found");
  }
  const isValid = await argon2.verify(userFromDB.password, password);
    if (!isValid) return res.status(401).json({ error: "Wrong Password" });
    const token = jwt.sign(
      { userId: user.id }, 
      'Allah_y5lilna_ye@bau$$', 
      { expiresIn: '1h' }     
  );

  res.json({
      message: "Login successful",
      token: token
  });
}catch(err){
  console.error(err);
  res.status(500).send("Internal Server Error");
}
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
