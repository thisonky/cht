const Queue = require('./models/Queue')
const Room = require('./models/Room')

const { Telegram } = require('telegraf')
const tg = new Telegram(process.env.BOT_TOKEN)

const { Markup } = require('telegraf')

const text = require(`./config/lang/${process.env.LANGUAGE}`)

class MatchMaker {
    async init() {
        setInterval(async () => {
            try {
                const queues = await Queue.find({}).limit(2);
                if (queues.length === 2) {
                    let newParticipan = [];
                    for (const q of queues) {
                        await Queue.deleteOne({ user_id: q.user_id });
                        newParticipan.push(q.user_id);
                    }
                    this.createRoom(newParticipan);
                }
            } catch (err) {
                console.error(err);
            }
        }, 2000);
    }

    createRoom(newParticipan) {
        let room = new Room({
            participans: newParticipan,
        });
        
        room.save(function(err, data) {
            if(err) return console.error(err)

            newParticipan.forEach(id => {
                tg.sendMessage(id, text.CREATE_ROOM.SUCCESS_1)
            });
            console.log(data)
        });
    }

    async find(userID) {
        try {
            const queueResult = await Queue.find({ user_id: userID });
            if (queueResult.length > 0) {
                await tg.sendMessage(userID, text.FIND.WARNING_1);
            } else {
                const roomResult = await Room.find({ participans: userID });
                if (roomResult.length > 0) {
                    await tg.sendMessage(userID, text.FIND.WARNING_2);
                } else {
                    await tg.sendMessage(userID, text.FIND.LOADING);
                    const queue = new Queue({ user_id: userID });
                    await queue.save();
                }
            }
        } catch (err) {
            console.error('Error in find method:', err);
        }
    }

    async next(userID) {
        try {
            const doc = await Room.findOneAndDelete({ participans: userID }); // Use async/await
            if (doc) {
                let participans = doc.participans;
                participans.forEach(async (id) => {
                    if (userID === id) {
                        await tg.sendMessage(userID, text.NEXT.SUCCESS_1);
                        await this.find(userID);
                    } else {
                        await tg.sendMessage(id, text.NEXT.SUCCESS_2);
                    }
                });
            } else {
                await tg.sendMessage(userID, text.NEXT.WARNING_1);
            }
        } catch (err) {
            console.error('Error in next method:', err);
        }
    }

    async stop(userID) {
        try {
            const doc = await Room.findOneAndDelete({ participans: userID }); // Use async/await
            if (doc) {
                let participans = doc.participans;
                participans.forEach(async (id) => {
                    if (userID === id) {
                        await tg.sendMessage(userID, text.STOP.SUCCESS_1);
                    } else {
                        await tg.sendMessage(id, text.STOP.SUCCESS_2);
                    }
                });
            } else {
                await tg.sendMessage(userID, text.STOP.WARNING_1);
            }
        } catch (err) {
            console.error('Error in stop method:', err);
        }
    }

    async exit(userID) {
        try {
            const doc = await Queue.findOneAndDelete({ user_id: userID }); // Use async/await
            if (doc) {
                await tg.sendMessage(userID, text.EXIT.SUCCESS_1);
            } else {
                await tg.sendMessage(userID, text.EXIT.WARNING_1);
            }
        } catch (err) {
            console.error('Error in exit method:', err);
        }
    }

    async connect(userID, [type, data]) {
        try {
            const rooms = await Room.find({ participans: userID }); // Use async/await

            if (rooms.length > 0) {
                let participans = rooms[0].participans;
                let index = participans.indexOf(userID);
                let partnerID = participans[index === 1 ? 0 : 1];

                switch (type) {
                    case 'text':
                        if (data.reply_to_message) {
                            await this.#sendReply(partnerID, userID, data.text, data, 'sendMessage');
                        } else {
                            await tg.sendMessage(partnerID, data.text);
                        }
                        break;
                    case 'sticker':
                        if (data.reply_to_message) {
                            await this.#sendReply(partnerID, userID, data.sticker.file_id, data, 'sendSticker');
                        } else {
                            await tg.sendSticker(partnerID, data.sticker.file_id);
                        }
                        break;
                    case 'voice':
                        if (data.reply_to_message) {
                            await this.#sendReply(partnerID, userID, data.voice.file_id, data, 'sendVoice');
                        } else {
                            await tg.sendVoice(partnerID, data.voice.file_id);
                        }
                        break;
                    case 'photo':
                        const urlPhoto = await tg.getFileLink(data);
                        const photoName = urlPhoto.pathname.split('/photos/')[1];
                        await tg.sendMessage(partnerID, text.USER_SEND_PHOTO.WARNING_1, 
                            Markup.inlineKeyboard([
                                [Markup.button.callback('Buka', 'openPhoto-' + String(photoName))],
                            ])
                        );
                        break;
                    case 'video':
                        const urlVideo = await tg.getFileLink(data);
                        const videoName = urlVideo.pathname.split('/videos/')[1];
                        await tg.sendMessage(partnerID, text.USER_SEND_VIDEO.WARNING_1, 
                            Markup.inlineKeyboard([
                                [Markup.button.callback('Buka', 'openVideo-' + String(videoName))],
                            ])
                        );
                        break;
                    default:
                        break;
                }
            } else {
                await tg.sendMessage(userID, text.CONNECT.WARNING_1);
            }
        } catch (err) {
            console.error('Error in connect method:', err);
        }
    }

    async currentActiveUser(userID) {
        let totalUserInRoom = await Room.countDocuments() * 2
        let totalUserInQueue = await Queue.countDocuments()
        let totalUser = totalUserInRoom + totalUserInQueue
        let textAactiveUser = text.ACTIVE_USER
            .replace('${totalUser}', totalUser)
            .replace('${totalUserInQueue}', totalUserInQueue)
            .replace('${totalUserInRoom}', totalUserInRoom)

        tg.sendMessage(userID, textAactiveUser)
    }

    #forceStop(userID) {
        Room.findOneAndDelete({participans: userID}, (err, doc) => {
            if(err) {
                console.log(err)
            }else {
                if(doc) {
                    let participans = doc.participans
                    participans.forEach(id => {
                        if(userID === id) {
                            tg.sendMessage(userID, text.STOP.SUCCESS_2)
                        }
                    })
                }
            }
        })
    }

    #errorWhenRoomActive({response, on}, userID) {
        console.log(response, on)
        switch (response.error_code) {
            case 403:
                this.#forceStop(userID)
                break;
            default:
                break;
        }
    }

    #sendReply(partnerID, userID, dataToSend, dataReply, type) {
        let {photo, video, message_id, from: {id} } = dataReply.reply_to_message

        let number = photo || video ? 2 : 1
        let replyToPlus =  { reply_to_message_id : message_id + number }
        let replyToMinus =  { reply_to_message_id : message_id - number }

        id == userID ? 
            tg[type](partnerID, dataToSend, replyToPlus) : 
            tg[type](partnerID, dataToSend, replyToMinus)
    }

}

module.exports = MatchMaker