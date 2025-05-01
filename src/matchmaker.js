const { Telegram } = require('telegraf');
const tg = new Telegram(process.env.BOT_TOKEN);

const { Markup } = require('telegraf');

const text = require(`./config/lang/${process.env.LANGUAGE}`);
const ChatStatus = require('./models/ChatStatus');

class MatchMaker {
    constructor() {
        this.activeChats = {};
        this.waitingUsers = [];
        this.loadStatusFromDatabase();
    }

    async loadStatusFromDatabase() {
        try {
            const status = await ChatStatus.findOne();
            if (status) {
                this.activeChats = Object.fromEntries(status.activeChats);
                this.waitingUsers = status.waitingUsers;
            }
        } catch (err) {
            console.error('Error loading chat status from database:', err);
        }
    }

    async saveStatusToDatabase() {
        try {
            await ChatStatus.findOneAndUpdate(
                {},
                {
                    activeChats: this.activeChats,
                    waitingUsers: this.waitingUsers,
                },
                { upsert: true }
            );
        } catch (err) {
            console.error('Error saving chat status to database:', err);
        }
    }

    async find(userID, langData) {
        try {
            if (this.activeChats[userID]) {
                tg.sendMessage(userID, langData.FIND.WARNING_1);
                return;
            }

            if (!this.waitingUsers.includes(userID)) {
                this.waitingUsers.push(userID);
                tg.sendMessage(userID, langData.FIND.LOADING);
                await this.saveStatusToDatabase();
            }

            const partnerID = this.waitingUsers.find(id => id !== userID);
            if (partnerID) {
                this.waitingUsers = this.waitingUsers.filter(id => id !== userID && id !== partnerID);
                this.activeChats[userID] = partnerID;
                this.activeChats[partnerID] = userID;

                tg.sendMessage(userID, langData.CREATE_ROOM.SUCCESS_1);
                tg.sendMessage(partnerID, langData.CREATE_ROOM.SUCCESS_1);
                await this.saveStatusToDatabase();
            } else {
                tg.sendMessage(userID, langData.FIND.WARNING_2);
            }
        } catch (err) {
            console.error('Error in find method:', err);
        }
    }

    async stop(userID, langData) {
        try {
            const partnerID = this.activeChats[userID];
            if (partnerID) {
                delete this.activeChats[userID];
                delete this.activeChats[partnerID];

                tg.sendMessage(userID, langData.STOP.SUCCESS_1);
                tg.sendMessage(partnerID, langData.STOP.SUCCESS_2);
                await this.saveStatusToDatabase();
            } else {
                tg.sendMessage(userID, langData.STOP.WARNING_1);
            }
        } catch (err) {
            console.error('Error in stop method:', err);
        }
    }

    async connect(userID, [type, data], langData) {
        try {
            const partnerID = this.activeChats[userID];
            if (partnerID) {
                switch (type) {
                    case 'text':
                        tg.sendMessage(partnerID, data.text);
                        break;
                    case 'sticker':
                        tg.sendSticker(partnerID, data.sticker.file_id);
                        break;
                    case 'voice':
                        tg.sendVoice(partnerID, data.voice.file_id);
                        break;
                    case 'photo':
                        tg.sendPhoto(partnerID, data);
                        break;
                    case 'video':
                        tg.sendVideo(partnerID, data);
                        break;
                    default:
                        break;
                }
            } else {
                tg.sendMessage(userID, langData.CONNECT.WARNING_1);
            }
        } catch (err) {
            console.error('Error in connect method:', err);
        }
    }

    async next(userID, langData) {
        try {
            const partnerID = this.activeChats[userID];
            if (partnerID) {
                // Hapus pasangan aktif
                delete this.activeChats[userID];
                delete this.activeChats[partnerID];

                // Kirim pesan ke kedua user
                tg.sendMessage(userID, langData.NEXT.SUCCESS_1);
                tg.sendMessage(partnerID, langData.NEXT.SUCCESS_2);

                // Tambahkan user kembali ke waitingUsers
                this.waitingUsers.push(userID);
                this.waitingUsers.push(partnerID);

                // Simpan status ke database
                await this.saveStatusToDatabase();

                // Cari partner baru untuk user
                this.find(userID, langData);
                this.find(partnerID, langData);
            } else {
                tg.sendMessage(userID, langData.NEXT.WARNING_1);
            }
        } catch (err) {
            console.error('Error in next method:', err);
        }
    }

    async exit(userID, langData) {
        try {
            // Hapus user dari waitingUsers jika ada
            const index = this.waitingUsers.indexOf(userID);
            if (index !== -1) {
                this.waitingUsers.splice(index, 1);
                tg.sendMessage(userID, langData.EXIT.SUCCESS_1);
                await this.saveStatusToDatabase();
            } else {
                tg.sendMessage(userID, langData.EXIT.WARNING_1);
            }
        } catch (err) {
            console.error('Error in exit method:', err);
        }
    }

    async currentActiveUser(userID, langData) {
        try {
            const totalUserInRoom = Object.keys(this.activeChats).length / 2; // Setiap pasangan dihitung sekali
            const totalUserInQueue = this.waitingUsers.length;
            const totalUser = totalUserInRoom + totalUserInQueue;

            const activeUserText = langData.ACTIVE_USER
                .replace('${totalUser}', totalUser)
                .replace('${totalUserInQueue}', totalUserInQueue)
                .replace('${totalUserInRoom}', totalUserInRoom);

            tg.sendMessage(userID, activeUserText);
        } catch (err) {
            console.error('Error in currentActiveUser method:', err);
        }
    }
}

module.exports = MatchMaker;