const express = require("express");
const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config();

const PORT = process.env.API_PORT || 4000;

var { mongoConnect } = require('./mongo.js');
mongoConnect();

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

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

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("sendMessage", (data) => {
    io.sockets.emit("message", data);
  });

  socket.on("sendFriendRequest", (data) => {
    console.log("sendFriendRequest data:", data);
    io.sockets.emit("newFriendRequest", data);
  });


  socket.on("friendRequestAccepted", (data) => {
    console.log("friendRequestAccepted data:", data);
    io.sockets.emit("updateFriendsList", { senderId: data.senderId });

  });



  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// register the routes

var indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const messagesRouter = require('./routes/messages');
const conversationsRouter = require('./routes/conversations');

app.use('/', indexRouter);
app.use('/api/user', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/conversations', conversationsRouter);

app.set("socketio", io);

server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
