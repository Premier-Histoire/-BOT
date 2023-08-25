const { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } = require("discord.js");
const axios = require('axios');

const FFLOGS_API_KEY = process.env.fflogs_token;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fflogs')
        .setDescription('指定されたプレイヤーのFFLogs情報を表示します')
        .addStringOption(option =>
            option.setName('playername')
                .setDescription('調べたいプレイヤーの名前')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server')
                .setDescription('プレイヤーのサーバー名')
                .setRequired(true)),

    /**
     * Executes this command
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    async execute(interaction, client) {
        const playerName = interaction.options.getString('playername');
        const serverName = interaction.options.getString('server');

        const playerData = await getFFLogsPlayerData(playerName, serverName);

        if (playerData) {
            const embed = new EmbedBuilder()
                .setTitle(`${playerName} on ${serverName}`)
            // ... 他のplayerDataの情報をEmbedに追加 ...

            interaction.reply({ embeds: [embed] });
        } else {
            interaction.reply('プレイヤーの情報を取得できませんでした。');
        }
    }
}

// FFLogsから指定されたプレイヤーの情報を取得する関数
async function getFFLogsPlayerData(playerName, serverName) {
    try {
        const response = await axios.get(`https://www.fflogs.com:443/v1/parses/character/${playerName}/${serverName}/Global?api_key=${FFLOGS_API_KEY}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching FFLogs player data:', error);
        return null;
    }
}
