const { SlashCommandBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', '..', 'mgpData.json');

function readMgpData() {
    try {
        const rawData = fs.readFileSync(JSON_PATH, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        return {}; // ファイルが存在しないかエラーが発生した場合は空のオブジェクトを返す
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mgp')
        .setDescription('現在のMGPを確認します'),

    async execute(interaction) {
        const mgpData = readMgpData();
        const userId = interaction.user.id;
        const userMgp = mgpData[userId] || 0; // ユーザーがデータに存在しない場合は0を返す
        const formattedMgp = numberWithCommas(userMgp); // ここでカンマ区切りに変換
        await interaction.reply(`あなたの現在のMGPは ${formattedMgp} です。`);
    }
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}