const express = require("express");
const router = express.Router();
const { db } = require("../mongo");

module.exports = function (io) {
  router.post("/", async (req, res) => {
    const { userId, friendId } = req.body;
     console.log("userId:", userId);
     console.log("friendId:", friendId);

    try {
      const user1 = await db().collection("users").findOne({ id:userId });
      const user2 = await db().collection("users").findOne({ id:friendId });


      const existingConversation = await db()
      .collection("conversations")
      .findOne({
      $and: [
      { "participants.id": userId },
      { "participants.id": friendId },
      { "participants": { $size: 2 } },
    ],
  });

if (existingConversation) {
  return res.status(400).json({ message: "Conversation already exists" });
}


      const newConversation = {
        participants: [
          {
            id: user1.id,
            firstName: user1.firstName,
            lastName: user1.lastName,
            avatar: user1.avatar,
          },
          {
            id: user2.id,
            firstName: user2.firstName,
            lastName: user2.lastName,
            avatar: user2.avatar,
          },
        ],
        createdAt: new Date(),
      };

      const result = await db().collection("conversations").insertOne(newConversation);

      const insertedId = result.insertedId;
      const insertedConversation = await db().collection("conversations").findOne({ _id: insertedId });

      res.status(201).json(insertedConversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Error creating conversation", error });
    }
  });

  router.get("/:userId", async (req, res) => {
    const userId = req.params.userId;

    const getUserData = async (id) => {
      const userData = await db().collection("users").findOne({ id: id });
      return userData;
    };

    try {
      // Fetch conversations for the given user from the database
      const conversations = await db()
        .collection("conversations")
        .find({ "participants.id": userId })
        .toArray();

      const conversationsWithFriendData = await Promise.all(
        conversations.map(async (conversation) => {
          const friendId = conversation.participants.find(
            (participant) => participant.id !== userId
          ).id;
          const friendData = await getUserData(friendId);
          return { ...conversation, friendData };
        })
      );

      res.json(conversationsWithFriendData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while fetching conversations" });
    }
  });





  return router;
};
