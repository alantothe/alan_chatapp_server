const express = require("express");
const { db } = require("../mongo");
const { v4: uuid } = require("uuid");
const router = express.Router();

module.exports = function (io) {
  router.post("/", async (req, res) => {
    try {

      const { senderId, receiverId, content } = req.body;
      const newMessage = {
        _id: uuid(),
        senderId,
        receiverId,
        content,
        timestamp: new Date(),
      };

      await db().collection("messages").insertOne(newMessage);

      res.status(201).json({ success: true, message: "Message sent successfully." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "An error occurred while sending the message." });
    }
  });

  router.get("/:receiverId/:senderId", async (req, res) => {
    try {
      const { receiverId, senderId } = req.params;

      const messages = await db()
        .collection("messages")
        .find({
          $or: [
            { senderId: senderId, receiverId: receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        })
        .sort({ timestamp: 1 })
        .toArray();

      res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "An error occurred while retrieving messages." });
    }
  });

  return router;
};

