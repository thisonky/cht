const mongoose = require('mongoose');

const chatStatusSchema = new mongoose.Schema({
    activeChats: {
        type: Map,
        of: String, // Key-value pairs of userID and partnerID
        default: {},
    },
    waitingUsers: {
        type: [String], // Array of userIDs
        default: [],
    },
}, { timestamps: true });

module.exports = mongoose.model('ChatStatus', chatStatusSchema);