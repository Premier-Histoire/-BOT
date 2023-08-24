const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ButtonBuilder, ButtonStyle, Client } = require("discord.js");
const { random } = require("lodash"); // lodashを使用してランダムな数字を生成します

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamestart')
        .setDescription('数字合計ゲームを開始します'),

    /**
     * このコマンドを実行します
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        // 1から9の間で重複しない6つの数字を生成します
        const numbers = [];
        while (numbers.length < 9) {
            const num = random(1, 9);
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }

        // 矢印と数字のボタンを作成します
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('diagonal_right')
                    .setLabel('↘')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('vertical_1')
                    .setLabel('↓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('vertical_2')
                    .setLabel('↓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('vertical_3')
                    .setLabel('↓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('diagonal_left')
                    .setLabel('↙')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('horizontal_1')
                    .setLabel('→')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('number_1')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('number_2')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('number_3')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('horizontal_2')
                    .setLabel('→')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('number_4')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('number_5')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('number_6')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary)
            );
        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('horizontal_3')
                    .setLabel('→')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('number_7')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('number_8')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('number_9')
                    .setLabel('-')
                    .setStyle(ButtonStyle.Secondary)
            );

        const rows = [row1, row2, row3, row4];

        await interaction.reply({
            content: '数字と矢印のボタンを選択してください！',
            components: rows
        });

        const filter = i => i.customId.startsWith('number_') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        // 数字のインデックスをトラックするカウンター
        let numberIndex = 0;
        let clickCount = 0;

        collector.on('collect', async (i) => {
            if (clickCount < 3 && numberIndex < numbers.length) {
                // Get the corresponding number and update the button's label
                const number = numbers[numberIndex];
                numberIndex++;

                // Find the index of the button in the components array
                const rowIndex = i.message.components.findIndex(row => row.components.some(btn => btn.customId === i.customId));
                const btnIndex = i.message.components[rowIndex].components.findIndex(btn => btn.customId === i.customId);

                // Create a new button with the updated label
                const updatedButton = new ButtonBuilder()
                    .setCustomId(i.customId)
                    .setLabel(String(number))
                    .setStyle(ButtonStyle.Secondary);

                // Replace the old button with the updated one
                i.message.components[rowIndex].components[btnIndex] = updatedButton;

                await i.update({ components: i.message.components });
                clickCount++; // クリック数を増加

                // If click count reaches 3, disable all buttons with customId from number_1 to number_9
                if (clickCount === 3) {
                    for (let row of i.message.components) {
                        for (let btn of row.components) {
                            if (btn.customId && btn.customId.startsWith('number_') && parseInt(btn.customId.split('_')[1]) <= 9) {
                                btn.setDisabled(true);
                            }
                        }
                    }
                    await i.update({ components: i.message.components });
                }
            } else {
                // If click count reaches 3 or all numbers are used, disable the button
                const rowIndex = i.message.components.findIndex(row => row.components.some(btn => btn.customId === i.customId));
                const btnIndex = i.message.components[rowIndex].components.findIndex(btn => btn.customId === i.customId);

                const disabledButton = new ButtonBuilder()
                    .setCustomId(i.customId)
                    .setLabel(i.message.components[rowIndex].components[btnIndex].label)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                i.message.components[rowIndex].components[btnIndex] = disabledButton;

                await i.update({ components: i.message.components });
            }
        });
    }
}