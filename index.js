require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

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

    // create event
    app.post("/allEvent", async (req, res) => {});

    // get all upcoming event
    app.get("/upcomingEvent", async (req, res) => {
      const cursor = eventCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
