const { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('エオルゼア経済大学の使い方'),
    /**
     * Executes this command
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    execute: async (interaction, client) => {
        const embed = new EmbedBuilder()
            .setTitle("エオルゼア経済大学の使い方")
            .setThumbnail(`https://cdn.discordapp.com/icons/1002212913035100160/716e869598af2bff0bbb2a20d3aebdd3.jpg`)
            .setColor(0x0099FF)
            .addFields(
                { name: '/help', value: '使用 `/help`\n ヘルプが表示されます。' },
                { name: '/craft', value: '使用 `/craft` `アイテム名` `品質` `DC` `サーバー(任意)`\n アイテムの原価と利益計算を行います。' },
                { name: '/history', value: '使用 `/history` `アイテム名` `DC` `サーバー(任意)`\n アイテムの取引履歴を表示します。' },
                { name: '/level', value: '使用 `/level` `キャラ名` `DC` `サーバー`\n プレイヤーのレベルを表示します。' },
            )
            .setTimestamp()
            .setFooter({ text: 'Powerd by Universalis', iconURL: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://universalis.app/&size=16' });

        interaction.reply({ embeds: [embed] });
    }
}