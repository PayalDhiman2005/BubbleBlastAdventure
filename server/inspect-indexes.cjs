require("dotenv").config();
const mongoose = require("mongoose");

async function checkIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const indexes = await mongoose.connection.db
            .collection("users")
            .indexes();

        console.log("EXISTING USER INDEXES:");
        console.log(indexes);

    } catch (error) {
        console.log(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkIndexes();
