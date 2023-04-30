const express = require("express");
const router = express.Router();
const { db } = require("../mongo");

router.post("/", async (req, res, next) => {
  const { userId, friendId } = req.body;

  try {
    // Check if conversation already exists
    let conversation = await db().collection("conversations").findOne({
      participants: { $all: [userId, friendId] },
    });

    if (!conversation) {
      // If conversation does not exist, create a new one
      const user = await db().collection("users").findOne({ id: userId });
      const friend = await db().collection("users").findOne({ id: friendId });

      const newConversation = {
        participants: [
          { id: user.id, email: user.email },
          { id: friend.id, email: friend.email },
        ],
      };

      const result = await db().collection("conversations").insertOne(newConversation);
      conversation = result.ops[0];
    }

    res.json(conversation);
  } catch (error) {
    console.error(error);
    next(error);
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

module.exports = router;
