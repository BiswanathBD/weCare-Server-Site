require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// firebase token verification
const admin = require("firebase-admin");
const serviceAccount = require("./wecare-service-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// token verification middleware for  firebase
const verifyFireBaseToken = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }

  try {
    const authInfo = await admin.auth().verifyIdToken(token);
    req.token_email = authInfo.email;
    next();
  } catch {
    return res.status(401).send({ message: "Unauthorize Access" });
  }
};

// mongodb connection
const uri = process.env.MONGODB_URI;

app.get("/", (req, res) => {
  res.send("weCare Server Running");
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const eventDB = client.db("eventDB");
    const eventCollection = eventDB.collection("eventCollection");
    const joinedUserCollection = eventDB.collection("joinedUserCollection");

    // create event
    app.post("/event", verifyFireBaseToken, async (req, res) => {
      const newEvent = req.body;
      const result = await eventCollection.insertOne(newEvent);
      res.send(result);
    });

    // get all upcoming event
    app.get("/events", async (req, res) => {
      const nowDate = new Date();

      const cursor = eventCollection.find();
      const events = await cursor.toArray();
      const upcomingEvents = events
        .filter((event) => {
          const eventDate = new Date(event.eventDate);
          return eventDate > nowDate;
        })
        .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

      res.send(upcomingEvents);
    });

    // get searched event by title
    app.get("/events/:search", async (req, res) => {
      const { search } = req.params;
      const nowDate = new Date();

      const normalizedSearch = search.replace(/\s+/g, "\\s*");
      const query = { title: { $regex: normalizedSearch, $options: "i" } };

      if (search === "") {
        const cursor = eventCollection.find();
        const events = await cursor.toArray();
        const upcomingEvents = events
          .filter((event) => {
            const eventDate = new Date(event.eventDate);
            return eventDate > nowDate;
          })
          .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

        res.send(upcomingEvents);
      } else {
        const cursor = eventCollection.find(query);
        const events = await cursor.toArray();
        const upcomingEvents = events
          .filter((event) => {
            const eventDate = new Date(event.eventDate);
            return eventDate > nowDate;
          })
          .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

        res.send(upcomingEvents);
      }
    });

    // get events by category
    app.get("/events/category/:category", async (req, res) => {
      const { category } = req.params;
      const result = await eventCollection.find({ category }).toArray();
      res.send(result);
    });

    // get events by user email
    app.get("/events/user/:email", async (req, res) => {
      const { email } = req.params;
      const result = await eventCollection
        .find({ creatorEmail: email })
        .toArray();
      res.send(result);
    });

    // get specific event
    app.get("/event/:id", async (req, res) => {
      const { id } = req.params;
      const result = await eventCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // delete event by id
    app.delete("/events/:eventId", verifyFireBaseToken, async (req, res) => {
      const { eventId } = req.params;

      const result = await eventCollection.deleteOne({
        _id: new ObjectId(eventId),
      });
      res.send(result);
    });

    // modify event by id
    app.put("/updateEvent/:eventId", verifyFireBaseToken, async (req, res) => {
      const { eventId } = req.params;
      const query = { _id: new ObjectId(eventId) };
      const updatedEvent = { $set: { ...req.body } };
      const result = await eventCollection.updateOne(query, updatedEvent);
      res.send(result);
    });

    // create join event data
    app.post("/joinEvent", verifyFireBaseToken, async (req, res) => {
      const newJoinData = req.body;
      const result = await joinedUserCollection.insertOne(newJoinData);
      res.send(result);
    });

    // get user joined data by email
    app.get(
      "/joinedEvent/user/:userEmail",
      verifyFireBaseToken,
      async (req, res) => {
        const { userEmail } = req.params;
        const result = await joinedUserCollection
          .find({ userEmail: userEmail })
          .sort({ eventDate: 1 })
          .toArray();
        res.send(result);
      }
    );

    // delete joined events data from user
    app.delete("/joinedEvent/:id", verifyFireBaseToken, async (req, res) => {
      const { id } = req.params;
      const result = await joinedUserCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // get isJoined data by eventId + userEmail
    app.get(
      "/isJoined/:userEmail/:eventId",
      verifyFireBaseToken,
      async (req, res) => {
        const { userEmail, eventId } = req.params;

        const joinedUser = await joinedUserCollection
          .find({ eventId })
          .toArray();

        const result = joinedUser.filter(
          (user) => user.userEmail === userEmail
        );

        res.send(result);
      }
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`weCare app listening on port ${port}`);
});
