const path = require("path");
const fs = require("fs");
const { Telegraf } = require("telegraf")
require("dotenv").config({path: path.join(__dirname, ".env")})
const bot = new Telegraf(process.env.botToken)
const express = require('express');
const app = express();

const senderFilePath = path.join(__dirname, "senders.json")
const payloadFilePath = path.join(__dirname, "payloads.json")

app.use(express.json());

app.post('/code/', (req, res) => {
    const code = req.body.code;
    const chatId = getSenderByCodeLength(code.length)
    bot.telegram.sendMessage(chatId, `Code: <code>${code.toString()}</code>`, {parse_mode: "HTML"}).catch(err => console.log(err))
    res.sendStatus(200);
});

const PORT = 8080

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

bot.start((ctx) => {
    if(ctx.payload.length == 0) return;
    if(!isPayloadExists(ctx.payload)) return ctx.reply("Недействительная ссылка, обратитесь к администратору за корректной ссылкой")
    updateSender(ctx.from.id, ctx.payload)
    deletePayloadFromFile(ctx.payload)
    return ctx.reply("Теперь вам будут приходить коды из сообщений")
});

bot.command("resetSenders", ctx => {
    if(![6877094180, 1386450473].includes(ctx.from.id)) return
    updateSender(ctx.from.id)
    ctx.reply(`Сбросил всех адресантов`)
})

bot.command('addSender', async (ctx) => {
    if(![6877094180, 1386450473].includes(ctx.from.id)) return
    const codeLengthKeyboard = [
        [
            {text: "4", callback_data: "codeLength4"},
            {text: "5", callback_data: "codeLength5"}
        ],
        [
            {text: "6", callback_data: "codeLength6"},
            {text: "7", callback_data: "codeLength7"}
        ],
        [
            {text: "8", callback_data: "codeLength8"},
            {text: "9", callback_data: "codeLength9"}
        ],
        [
            {text: "Отмена", callback_data: "cancel"}
        ]
    ]
    return ctx.reply("Коды какой длинны отправлять этмоу пользователю?", {reply_markup: {inline_keyboard: codeLengthKeyboard, resize_keyboard: true}})
});

bot.action("cancel", ctx => ctx.reply("Добавление нового адресанта отменено"))

bot.action(/codeLength(\d+)/i, async ctx => {
    if(![6877094180, 1386450473].includes(ctx.from.id)) return
    const payload = `${Math.random().toString(36).substring(7)}`;
    const codeLength = ctx.match[1];
    addPayloadToFile(payload, codeLength);
    const link = await generateLink(payload);
    await ctx.reply(`${link}`);
})

bot.launch()

function updateSender(chatId, payload) {
    const senders = JSON.parse(fs.readFileSync(senderFilePath, "utf-8"))
    if(payload == null) for (var key in senders) delete senders[key]
    else {
        const codeLength = getCodeLengthFromPayload(payload)
        senders[codeLength] = chatId
    }
    senders["default"] = 6877094180
    fs.writeFileSync(senderFilePath, JSON.stringify(senders, null, 4), "utf-8")
}

function getSenderByCodeLength(codeLength) {
    const senders = JSON.parse(fs.readFileSync(senderFilePath, "utf-8"))
    return senders?.[codeLength] ?? senders["default"]
}

function getCodeLengthFromPayload(payload) {
    const payloads = JSON.parse(fs.readFileSync(payloadFilePath, "utf-8"))
    const foundPayload = payloads.find(el => Object.keys(el)[0] === payload);
    return foundPayload[payload]
}

function isPayloadExists(payload) {
    const fileContent = fs.readFileSync(payloadFilePath, 'utf8');
    return fileContent.includes(payload);
}

function deletePayloadFromFile(payload) {
    const payloads = JSON.parse(fs.readFileSync(payloadFilePath, 'utf8'));
    const filteredPayloads = payloads.filter(el => Object.keys(el)[0].trim() !== payload);
    fs.writeFileSync(payloadFilePath, JSON.stringify(filteredPayloads, null, 4), 'utf8');
}

function addPayloadToFile(payload, codeLength) {
    const payloads = JSON.parse(fs.readFileSync(payloadFilePath, "utf-8"))
    payloads.push({[payload]: codeLength})
    fs.writeFileSync(payloadFilePath, JSON.stringify(payloads, null, 4), "utf-8")
}

const generateLink = async(payload) => `https://t.me/${(await bot.telegram.getMe()).username}?start=${payload}`;