const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1fwa7gk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classesCollection = client.db("enigmaDB").collection("classes");
    const mySelectedClassCollection = client
      .db("enigmaDB")
      .collection("mySelectedClass");
    const paymentCollection = client.db("enigmaDB").collection("payments");
    const usersCollection = client.db('enigmaDB').collection("users")



    // users related apis

    app.get('/users', async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query)
      if(existingUser) {
        return res.send({message: 'user already exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result);
    })

    app.patch('/users/instructor/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result);
    })


    // classes
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // my selected class collection
    app.get("/mySelectedClass", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await mySelectedClassCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/mySelectedClass", async (req, res) => {
      const item = req.body;
      const result = await mySelectedClassCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/mySelectedClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await mySelectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment related api
    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().sort({ date: -1 }).toArray();
      res.send(result);
    });
    
    app.post('/payments', async(req,res)=>{
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query={_id: {$in: payment.selectedClass.map(id => new ObjectId(id))}}
      const deleteResult = await mySelectedClassCollection.deleteOne(query)

      res.send({ insertResult, deleteResult});
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("enigma magic server is running");
});

app.listen(port, () => {
  console.log(`Enigma magic server is running on port ${port}`);
});
