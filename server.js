const express = require("express");
const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const PORT = process.env.API_PORT || 4000;

var { mongoConnect } = require('./mongo.js');
mongoConnect();

const app = express();
app.use(express.json());
app.use(logger('dev'));
app.use(cors());
app.use('/uploads', express.static('uploads'));



// Add CORS headers
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Create HTTP server and socket.io server
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const emailToSocketMap = new Map();

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on("register_email", (data) => {
    emailToSocketMap.set(data.email, socket);
  });

  socket.on('send_friend_request', async (data) => {
    try {
      const recipientSocket = emailToSocketMap.get(data.recipientEmail);

      if (recipientSocket) {
        recipientSocket.emit("friend_request_received", data);
      } else {
        console.error("Socket not found for email:", data.recipientEmail);
      }
    } catch (error) {
      console.error("Error processing friend request:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// register the routes

var indexRouter = require('./routes/index');
const usersRouter = require('./routes/users')(io);

app.use('/', indexRouter);
app.use('/api/user', usersRouter);
app.set('io', io);

// Use the HTTP server to listen instead of the app
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

