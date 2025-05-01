require('dotenv').config()
require('./src/config/database')

const fs = require('fs'); // Add this at the top to use fs for reading files

const text = require(`./src/config/lang/${process.env.LANGUAGE}`)

const express = require('express')
const app = express()
const port = process.env.PORT || 5001; // Changed default port to 5001

const { Telegraf} = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)

// Add a map to store user language preferences
const userLanguages = new Map();

const MatchMaker = require('./src/matchmaker')
let Matchmaker = new MatchMaker()

bot.start((ctx) => {
    ctx.reply('Please select your language / Silakan pilih bahasa Anda:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'English', callback_data: 'lang_EN' },
                    { text: 'Bahasa Indonesia', callback_data: 'lang_ID' }
                ]
            ]
        }
    });
});

bot.command('bug', (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN'; // Default to EN if no language is set
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

    const inlineText = userLang === 'EN' ? '🧑‍💻 Contact Admin' : '🧑‍💻 Hubungi Admin'; // Dynamic inline text based on language

    ctx.replyWithHTML(`<i>${langData.CONTRIBUTE}</i>`, {
        reply_markup: {
            inline_keyboard: [[{ text: inlineText, url: 'https://t.me/KEKprojects_bot' }]]
        }
    });
});

bot.command('help', (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN'; // Default to EN if no language is set
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    ctx.replyWithHTML(`<i>${langData.HELP}</i>`);
});

bot.command('ping', (ctx) => {
    const start = new Date()
    const s = start / 1000 - ctx.message.date
    ctx.replyWithHTML(`${text.PING} - <code>⏱ ${s.toFixed(3)} s</code>`);
});

bot.command('find', (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN'; // Default to EN if no language is set
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

    let id = ctx.message.chat.id;
    Matchmaker.find(id, langData); // Pass the language data to the method
});

bot.command('next', (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN';
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

    let id = ctx.message.chat.id;
    Matchmaker.next(id, langData);
});

bot.command('stop', (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN';
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

    let id = ctx.message.chat.id;
    Matchmaker.stop(id, langData);
});

bot.command('exit', (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN';
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

    let id = ctx.message.chat.id;
    Matchmaker.exit(id, langData);
});

bot.command('users', async (ctx) => {
    const userLang = userLanguages.get(ctx.from.id) || 'EN'; // Default to EN if no language is set
    const langFilePath = `./src/config/lang/${userLang}.json`;
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    const id = ctx.message.chat.id;
    await Matchmaker.currentActiveUser(id, langData); // Pass the language data to the method
});

bot.on('text', (ctx) => {
    let id = ctx.message.chat.id
    let message = ctx.message
    Matchmaker.connect(id, ['text', message])
})

bot.on('sticker', (ctx) => {
    let id = ctx.message.chat.id
    let sticker = ctx.message
    Matchmaker.connect(id, ['sticker', sticker])
})

bot.on('voice', (ctx) => {
    let id = ctx.message.chat.id
    let voice = ctx.message
    Matchmaker.connect(id, ['voice', voice])
})

bot.on('photo', (ctx) => {
    let id = ctx.message.chat.id
    let photos = ctx.message.photo
    let photoID = photos[photos.length - 1].file_id
    Matchmaker.connect(id, ['photo', photoID])
})

bot.on('video', (ctx) => {
    let id = ctx.message.chat.id
    let videoID = ctx.message.video.file_id
    Matchmaker.connect(id, ['video', videoID])
})

bot.on('callback_query', async (ctx) => {
    let query = ctx.callbackQuery.data.split('_').map(item => item.trim());
    console.log('Parsed query:', query);

    if (query[0] === 'lang') {
        const selectedLanguage = query[1];
        if (selectedLanguage === 'EN' || selectedLanguage === 'ID') {
            userLanguages.set(ctx.from.id, selectedLanguage); // Save user language preference
            ctx.reply(`Language set to ${selectedLanguage === 'EN' ? 'English' : 'Bahasa Indonesia'}`);

            try {
                const langFilePath = `./src/config/lang/${selectedLanguage}.json`;
                const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

                // Send START message with italicized text using HTML
                ctx.replyWithHTML(`<i>${langData.START}</i>`);
            } catch (error) {
                console.error('Error loading language file:', error);
                ctx.reply('Failed to load the selected language. Please try again.');
            }
        } else {
            ctx.reply('Invalid language selection.');
        }
    } else {
        ctx.reply('Unknown action. Please try again.');
    }
});

bot.launch()

app.get('/', (req, res) => res.send("Hello World!"))

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
