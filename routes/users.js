const { ObjectId } = require("mongodb");
const express = require("express");
const bcrypt = require("bcrypt");
const { v4: uuid } = require("uuid");
const { db } = require("../mongo");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const router = express.Router();

const fs = require("fs");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, uuid() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

module.exports = function (io) {
  router.post("/register", upload.single("avatar"), async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      const existingUser = await db().collection("users").findOne({ email });
      if (existingUser) {
        res
          .status(409)
          .json({ success: false, message: "Email already exists." });
        return;
      }

      const saltRounds = 5;
      const salt = await bcrypt.genSalt(saltRounds);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = {
        id: uuid(),
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: passwordHash,
        avatar: req.file.path,
        friends: [],
        friendRequests: [],

      };

      const result = await db().collection("users").insertOne(user);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await db().collection("users").findOne({ email });

      if (!user) {
        res.json({ success: false, message: "Could not find user." }).status(204);
        return;
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        res.json({ success: false, message: "Password was incorrect." }).status(204);
        return;
      }

      const userData = {
        date: new Date(),
        userId: user.id,
      };

      const exp = Math.floor(Date.now() / 1000) + 60 * 60;
      const payload = {
        userData,
        exp,
      };

      const jwtSecretKey = process.env.TOKEN_KEY;
      const token = jwt.sign(payload, jwtSecretKey);

      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
      };

      res.json({ success: true, token, email, user: userResponse });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const users = db().collection("users");

      const user = await users.findOne({ id: userId });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
      } else {
        // Populate friends array with friend objects
        const friends = await users.find({ id: { $in: user.friends } }).toArray();
        user.friends = friends;

        res.json(user);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });





  router.post("/send-friend-request", async (req, res) => {
    const { senderId, recipientEmail } = req.body;

    if (!senderId || !recipientEmail) {
      return res.status(400).json({ message: "Sender ID and recipient email are required." });
    }

    try {
      const user = db().collection("users");
      const sender = await user.findOne({ id: senderId });
      const recipient = await user.findOne({ email: recipientEmail });

      if (!recipient) {
        return res.status(404).json({ message: "User not found." });
      }

      const senderInfo = {
        id: sender.id,
        firstName: sender.firstName,
        lastName: sender.lastName,
        avatar: sender.avatar,
      };

      await user.updateOne(
        { _id: recipient._id },
        { $addToSet: { friendRequests: senderInfo } }
      );

      res.status(200).json({
        message: "Friend request sent.",
        sender: senderInfo,
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while sending the friend request." });
    }
  });

  router.post("/accept-friend-request", async (req, res) => {

  const { senderId, receiverId } = req.body;

   const users = db().collection("users");

  try {
      // Retrieve sender and receiver data
      const sender = await users.findOne({ id: senderId });
      const receiver = await users.findOne({ id: receiverId });

      // Add senderId to the receiver's friends array
      await users.updateOne({ id: receiverId }, { $addToSet: { friends: senderId } });

      // Add receiverId to the sender's friends array
      await users.updateOne({ id: senderId }, { $addToSet: { friends: receiverId } });

      // Remove senderId from the receiver's friendRequests array
      await users.updateOne({ id: receiverId }, { $pull: { friendRequests: { id: senderId } } });

      // Get the updated friend's data
      const updatedFriend = {
        id: sender.id,
        firstName: sender.firstName,
        lastName: sender.lastName,
        avatar: sender.avatar,
      };

  // Emit an event to notify the sender that the friend request has been accepted
      const io = req.app.get("io");
      io.to(senderId).emit("friend_request_accepted");
      io.to(receiverId).emit("friend_request_accepted");
      console.log(updatedFriend)

      res.status(200).json(updatedFriend);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while accepting the friend request." });
    }

  }
  );




  router.post("/reject-friend-request", async (req, res) => {
    const { senderId, receiverId } = req.body;
    const users = db().collection("users");

    try {
      // Remove senderId from the receiver's friendRequests array
      await users.updateOne({ id: receiverId }, { $pull: { friendRequests: { id: senderId } } });

      res.status(200).json({ message: "Friend request rejected." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while rejecting the friend request." });
    }
  });






  return router;
};



