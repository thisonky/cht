const mongoose = require('mongoose');

const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✔ MongoDB connected successfully');
    } catch (error) {
        console.error('✘ MongoDB connection error:', error.message);
        process.exit(1); // Exit the application if the database connection fails
    }
};

mongoose.connection.on('connected', () => {
    console.log('✔ Database Connected');
});

mongoose.connection.on('error', (err) => {
    console.error('✘ MongoDB connection error:', err.message);
});

module.exports = connectToDatabase;