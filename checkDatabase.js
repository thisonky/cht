require('dotenv').config();

const mongoose = require('mongoose');

const checkDatabase = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✔ Connected to MongoDB');

        const db = mongoose.connection.db;

        // Check if database exists
        const admin = db.admin();
        const databases = await admin.listDatabases();
        const dbExists = databases.databases.some(db => db.name === 'anonim-chat');

        if (!dbExists) {
            console.log('❌ Database "anonim-chat" does not exist.');
            return;
        }
        console.log('✔ Database "anonim-chat" exists.');

        // Check if collections exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);

        if (collectionNames.includes('queues')) {
            console.log('✔ Collection "queues" exists.');
        } else {
            console.log('❌ Collection "queues" does not exist.');
        }

        if (collectionNames.includes('rooms')) {
            console.log('✔ Collection "rooms" exists.');
        } else {
            console.log('❌ Collection "rooms" does not exist.');
        }
    } catch (error) {
        console.error('Error checking database:', error.message);
    } finally {
        mongoose.connection.close();
    }
};

checkDatabase();