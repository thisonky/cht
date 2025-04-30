const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log('✔ Database Connected')
    }).catch((err) => {
        console.error('✘ MONGODB ERROR: ', err.message)
    })

mongoose.connection.on('connected', () => {
    console.log('✔ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
    console.error('✘ MongoDB connection error:', err.message);
});