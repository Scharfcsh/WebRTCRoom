
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";

import authRoutesrouter from "./src/routes/auth.routes.js";
import userRoutesRouter from "./src/routes/user.routes.js";
import connectDB from "./src/db/connectDB.js";
import {server, app} from "./index.js";
import cors from 'cors';
import protectRoute from "./src/middleware/protectedRoute.js";

const PORT = 3000;

dotenv.config();


let corsOptions = {
    origin: '*',
    credential : true,
    methods: ["GET", "HEAD","POST", "PUT", "DELETE"],
  };
  
app.use(cors(corsOptions));
  

app.use(cookieParser());
app.use(express.json());  //to parse the incoming request wiht json{from req.body}

app.use("/api/auth",authRoutesrouter);
app.use("/api/users",protectRoute,userRoutesRouter);


app.get('/isactive', (req, res)=>{
    res.send('Hello Developer! Your server is running')
})


server.listen(PORT, ()=>{

    // connectDB().then(()=> console.log("Connected to Mongodb from Index")).catch(()=> console.log(error));
    connectDB()
    console.log(`Server is running on port${PORT} , Http://localhost:${PORT}`);
})
