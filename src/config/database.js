const mongoose = require('mongoose');

const connectToDatabase = async () => {
    try {
        console.log('Attempting to connect to MongoDB...'); // Debug log
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
        });
        console.log('✔ MongoDB connected successfully');
    } catch (error) {
        console.error('✘ MongoDB connection error:', error.message);
        console.error('Ensure that your MongoDB URI is correct and accessible.');
        process.exit(1); // Exit the application if the database connection fails
    }
};

mongoose.connection.on('connected', () => {
    console.log('✔ Database Connected');
});

mongoose.connection.on('error', (err) => {
    console.error('✘ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠ MongoDB disconnected. Retrying connection...');
    connectToDatabase(); // Retry connection on disconnection
});

module.exports = connectToDatabase;