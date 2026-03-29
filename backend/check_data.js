const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function checkData() {
    if (!uri) {
        console.error("MONGODB_URI or MONGO_URI not found in .env");
        return;
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(uri, {
            tls: true,
        });
        console.log("Connected to:", mongoose.connection.name);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("\nCollections found:");

        for (const coll of collections) {
            const count = await mongoose.connection.db.collection(coll.name).countDocuments();
            console.log(`- ${coll.name}: ${count} documents`);
        }

        // Inspect key collections
        const keyCollections = ["registrations", "stations", "employees", "fuels", "anomalies", "sensors"];

        for (const name of keyCollections) {
            if (collections.some(c => c.name === name)) {
                console.log(`\n--- Sample from ${name} ---`);
                const samples = await mongoose.connection.db.collection(name).find().limit(2).toArray();
                console.log(JSON.stringify(samples, null, 2));
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
}

checkData();
