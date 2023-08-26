const { SlashCommandBuilder, CommandInteraction, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('race')
        .setDescription('チョコボレースゲームを開始します')
        .addIntegerOption(option =>
            option.setName('horse')
                .setDescription('1から5の間でチョコボを選んでください')
                .setRequired(true)),

    /**
     * Executes the race game
     * @param {CommandInteraction} interaction
     */
    execute: async (interaction) => {
        const chocoboEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === 'Chocobo');
        if (!chocoboEmoji) {
            return interaction.reply('サーバーに"Chocobo"という名前の絵文字が見つかりませんでした。');
        }

        const userChoice = interaction.options.getInteger('horse');

        if (userChoice < 1 || userChoice > 5) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("エラー")
                .setColor(0xFF0000)
                .setDescription('1から5の間でチョコボを選んでください。');

            return interaction.reply({ embeds: [errorEmbed] });
        }

        let raceTrack = Array(5).fill(chocoboEmoji.toString());
        let positions = [0, 0, 0, 0, 0];
        const maxSteps = 20;

        const trackOverview = `🏁${'　'.repeat(maxSteps)}🏁 `;

        const embed = new EmbedBuilder()
            .setTitle("チョコボレースゲームの進行中")
            .setColor(0x0099FF)
            .setDescription(trackOverview + '\n\n' + raceTrack.map((track, idx) => `${idx + 1}. ${track}`).join('\n'))
            .setTimestamp();

        const raceMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

        const raceInterval = setInterval(async () => {
            for (let i = 0; i < 5; i++) {
                if (Math.random() > 0.5) {
                    positions[i]++;
                }
                raceTrack[i] = '　'.repeat(positions[i]) + chocoboEmoji.toString();
            }

            embed.setDescription(trackOverview + '\n' + raceTrack.map((track, idx) => `${idx + 1}. ${track}`).join('\n'));
            await raceMessage.edit({ embeds: [embed] });

            const winningHorse = positions.findIndex(position => position >= maxSteps);

            if (winningHorse !== -1) {
                clearInterval(raceInterval);
                const resultEmbed = new EmbedBuilder()
                    .setTitle("チョコボレースゲームの結果")
                    .setColor(0x0099FF)
                    .setDescription(userChoice === (winningHorse + 1) ?
                        `勝ちチョコボは${winningHorse + 1}番です！おめでとうございます！` :
                        `勝ちチョコボは${winningHorse + 1}番です。残念、もう一度挑戦してみてください！`)
                    .setTimestamp();
                interaction.followUp({ embeds: [resultEmbed] });
            }
        }, 1000);
    }
}
