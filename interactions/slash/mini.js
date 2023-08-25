const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ButtonBuilder, ButtonStyle, Client } = require("discord.js");
const { random } = require("lodash");
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mini')
        .setDescription('ミニくじテンダー'),

    async execute(interaction) {
        const numbers = [];
        while (numbers.length < 9) {
            const num = random(1, 9);
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }

        const rows = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('diagonal_right').setLabel('↘').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('vertical_1').setLabel('↓').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('vertical_2').setLabel('↓').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('vertical_3').setLabel('↓').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('diagonal_left').setLabel('↙').setStyle(ButtonStyle.Primary).setDisabled(true)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('horizontal_1').setLabel('→').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('number_1').setLabel('-').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('number_2').setLabel('-').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('number_3').setLabel('-').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('horizontal_2').setLabel('→').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('number_4').setLabel('-').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('number_5').setLabel('-').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('number_6').setLabel('-').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('horizontal_3').setLabel('→').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('number_7').setLabel('-').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('number_8').setLabel('-').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('number_9').setLabel('-').setStyle(ButtonStyle.Secondary)
            )
        ];

        const randomIndex = random(0, 8);
        const randomButtonId = `number_${randomIndex + 1}`;
        const randomRow = rows.find(row => row.components.some(btn => btn.data.custom_id === randomButtonId));
        const randomButtonComponent = randomRow.components.find(btn => btn.data.custom_id === randomButtonId);

        const updatedButton = new ButtonBuilder()
            .setCustomId(randomButtonId)
            .setLabel(String(numbers[randomIndex]))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const buttonIndex = randomRow.components.indexOf(randomButtonComponent);
        randomRow.components[buttonIndex] = updatedButton;

        await interaction.reply({
            content: 'ミニくじテンダー',
            components: rows
        });

        const filter = i => (i.customId.startsWith('number_') || i.customId.startsWith('horizontal_') || i.customId.startsWith('diagonal_') || i.customId.startsWith('vertical_')) && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        let clickCount = 0;

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('number_')) {
                const index = parseInt(i.customId.split('_')[1]) - 1;
                const number = numbers[index];

                const updatedButton = new ButtonBuilder()
                    .setCustomId(i.customId)
                    .setLabel(String(number))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const rowIndex = i.message.components.findIndex(row => row.components.some(btn => btn.customId === i.customId));
                const btnIndex = i.message.components[rowIndex].components.findIndex(btn => btn.customId === i.customId);

                i.message.components[rowIndex].components[btnIndex] = updatedButton;

                clickCount++;

                if (clickCount === 3) {
                    for (let row of i.message.components) {
                        for (let btn of row.components) {
                            if (btn.customId && btn.customId.startsWith('number_') && !btn.disabled) {
                                const disabledButton = new ButtonBuilder()
                                    .setCustomId(btn.customId)
                                    .setLabel(btn.label)
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true);
                                const rowIndexDisable = i.message.components.findIndex(r => r.components.some(b => b.customId === btn.customId));
                                const btnIndexDisable = i.message.components[rowIndexDisable].components.findIndex(b => b.customId === btn.customId);
                                i.message.components[rowIndexDisable].components[btnIndexDisable] = disabledButton;
                            }
                            if (btn.customId && (btn.customId.startsWith('horizontal_') || btn.customId.startsWith('diagonal_') || btn.customId.startsWith('vertical_')) && btn.disabled) {
                                const enabledButton = new ButtonBuilder()
                                    .setCustomId(btn.customId)
                                    .setLabel(btn.label)
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(false);
                                const rowIndexEnable = i.message.components.findIndex(r => r.components.some(b => b.customId === btn.customId));
                                const btnIndexEnable = i.message.components[rowIndexEnable].components.findIndex(b => b.customId === btn.customId);
                                i.message.components[rowIndexEnable].components[btnIndexEnable] = enabledButton;
                            }
                        }
                    }
                }

                await i.update({ components: i.message.components });
            } else if (i.customId.startsWith('horizontal_') || i.customId.startsWith('diagonal_') || i.customId.startsWith('vertical_')) {
                let correspondingNumbers = [];
                switch (i.customId) {
                    case 'horizontal_1':
                        correspondingNumbers = ['number_1', 'number_2', 'number_3'];
                        break;
                    case 'horizontal_2':
                        correspondingNumbers = ['number_4', 'number_5', 'number_6'];
                        break;
                    case 'horizontal_3':
                        correspondingNumbers = ['number_7', 'number_8', 'number_9'];
                        break;
                    case 'diagonal_right':
                        correspondingNumbers = ['number_1', 'number_5', 'number_9'];
                        break;
                    case 'diagonal_left':
                        correspondingNumbers = ['number_3', 'number_5', 'number_7'];
                        break;
                    case 'vertical_1':
                        correspondingNumbers = ['number_1', 'number_4', 'number_7'];
                        break;
                    case 'vertical_2':
                        correspondingNumbers = ['number_2', 'number_5', 'number_8'];
                        break;
                    case 'vertical_3':
                        correspondingNumbers = ['number_3', 'number_6', 'number_9'];
                        break;
                }

                for (let row of i.message.components) {
                    for (let btn of row.components) {
                        if (correspondingNumbers.includes(btn.customId)) {
                            const index = parseInt(btn.customId.split('_')[1]) - 1;
                            const number = numbers[index];
                            const updatedButton = new ButtonBuilder()
                                .setCustomId(btn.customId)
                                .setLabel(String(number)) // ここで該当する数字に変更
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true);
                            const rowIndex = i.message.components.findIndex(r => r.components.some(b => b.customId === btn.customId));
                            const btnIndex = i.message.components[rowIndex].components.findIndex(b => b.customId === btn.customId);
                            i.message.components[rowIndex].components[btnIndex] = updatedButton;
                        }
                    }
                }

                // すべての数字ボタンを開示
                for (let row of i.message.components) {
                    for (let btn of row.components) {
                        if (btn.customId && btn.customId.startsWith('number_')) {
                            const index = parseInt(btn.customId.split('_')[1]) - 1;
                            const number = numbers[index];
                            const revealedButton = new ButtonBuilder()
                                .setCustomId(btn.customId)
                                .setLabel(String(number))
                                .setStyle(btn.style) // 既存のスタイルを維持
                                .setDisabled(true);
                            const rowIndexReveal = i.message.components.findIndex(r => r.components.some(b => b.customId === btn.customId));
                            const btnIndexReveal = i.message.components[rowIndexReveal].components.findIndex(b => b.customId === btn.customId);
                            i.message.components[rowIndexReveal].components[btnIndexReveal] = revealedButton;
                        }
                    }
                }

                for (let row of i.message.components) {
                    for (let btn of row.components) {
                        if (btn.customId && (btn.customId.startsWith('horizontal_') || btn.customId.startsWith('diagonal_') || btn.customId.startsWith('vertical_'))) {
                            const disabledArrowButton = new ButtonBuilder()
                                .setCustomId(btn.customId)
                                .setLabel(btn.label)
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true);
                            const rowIndexDisable = i.message.components.findIndex(r => r.components.some(b => b.customId === btn.customId));
                            const btnIndexDisable = i.message.components[rowIndexDisable].components.findIndex(b => b.customId === btn.customId);
                            i.message.components[rowIndexDisable].components[btnIndexDisable] = disabledArrowButton;
                        }
                    }
                }

                await i.update({ components: i.message.components });

                let sum = 0;
                switch (i.customId) {
                    case 'horizontal_1':
                        sum = numbers[0] + numbers[1] + numbers[2];
                        break;
                    case 'horizontal_2':
                        sum = numbers[3] + numbers[4] + numbers[5];
                        break;
                    case 'horizontal_3':
                        sum = numbers[6] + numbers[7] + numbers[8];
                        break;
                    case 'diagonal_right':
                        sum = numbers[0] + numbers[4] + numbers[8];
                        break;
                    case 'diagonal_left':
                        sum = numbers[2] + numbers[4] + numbers[6];
                        break;
                    case 'vertical_1':
                        sum = numbers[0] + numbers[3] + numbers[6];
                        break;
                    case 'vertical_2':
                        sum = numbers[1] + numbers[4] + numbers[7];
                        break;
                    case 'vertical_3':
                        sum = numbers[2] + numbers[5] + numbers[8];
                        break;
                }
                const mgpValues = {
                    6: 10000,
                    7: 36,
                    8: 720,
                    9: 360,
                    10: 80,
                    11: 252,
                    12: 108,
                    13: 72,
                    14: 54,
                    15: 180,
                    16: 72,
                    17: 180,
                    18: 119,
                    19: 36,
                    20: 306,
                    21: 1080,
                    22: 144,
                    23: 1800,
                    24: 3600
                };
                const mgp = mgpValues[sum];

                // 既存のMGPデータを読み込む
                const mgpData = readMgpData();

                // ユーザーのIDを取得する
                const userId = i.user.id;

                // ユーザーのMGPを更新する。JSONにユーザーが存在しない場合は、0 MGPからスタートする。
                mgpData[userId] = (mgpData[userId] || 0) + mgp;

                // 更新されたMGPデータを保存する
                writeMgpData(mgpData);
                const formattedMgp = numberWithCommas(mgp);
                await i.followUp(`:tada: 獲得したMGPは ${formattedMgp} です！:tada: `);
            }
        }
        )
    }
}

const JSON_PATH = path.join(__dirname, '..', '..', 'mgpData.json');

function readMgpData() {
    try {
        const rawData = fs.readFileSync(JSON_PATH, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        return {}; // ファイルが存在しないかエラーが発生した場合は空のオブジェクトを返す
    }
}

function writeMgpData(data) {
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}