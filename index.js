import express from "express";
import { argon2 } from "argon2";
import jwt from "jwt";
import authRouter from "./routes/auth.routes";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

const router = express.router();

app.use(express.json());

<<<<<<< HEAD
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
app.post("/SignUpEmail",async (req, res) => {
  try{
  let {email, password} = req.body;
  
  let userFromDB = prisma.users.findUnique({
    where: {
      email: email, 
    }
  });  // TODO: Fix table name
  if(userFromDB){
    return res.status(400).send("Email already exists"); 
  }
  const hashedPassword = await argon2.hash(password);
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


=======
//ROUTES
app.use("/auth", authRouter);
>>>>>>> e4e2f1c00c5f8414c8a1bcd079787594ff784155

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
