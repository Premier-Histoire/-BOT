const { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', '..', 'mgpData.json');

function generateOdds() {
    let odds = [];
    for (let i = 0; i < 5; i++) {
        odds.push(Math.random() * 5 + 1);
    }
    return odds;
}

function getWinningProbability(odds, horseIndex) {
    return 1 / odds[horseIndex];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('race')
        .setDescription('チョコボレースゲームを開始します'),

    execute: async (interaction) => {
        const userId = interaction.user.id.toString();
        const chocoboEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === 'Chocobo');
        if (!chocoboEmoji) {
            return interaction.reply('サーバーに"Chocobo"という名前の絵文字が見つかりませんでした。');
        }

        const odds = generateOdds();
        const oddsMessage = "オッズ:\n" + odds.map((odd, idx) => `${idx + 1}. ${odd.toFixed(2)}x`).join('\n');

        const horseSelectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select-horse')
                    .setPlaceholder('チョコボを選択してください')
                    .addOptions([
                        { label: '1番', value: 'horse_1' },
                        { label: '2番', value: 'horse_2' },
                        { label: '3番', value: 'horse_3' },
                        { label: '4番', value: 'horse_4' },
                        { label: '5番', value: 'horse_5' }
                    ])
            );

        // チョコボの選択を促すメッセージを送信
        await interaction.reply({ content: oddsMessage, components: [horseSelectRow] });

        // ユーザーの選択を待つ
        const horseResponse = await interaction.channel.awaitMessageComponent({
            filter: i => i.customId === 'select-horse' && i.user.id === userId,
            time: 60000
        });

        const chosenHorse = parseInt(horseResponse.values[0].split('_')[1]);

        const betSelectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select-bet')
                    .setPlaceholder('賭け金額を選択してください')
                    .addOptions([
                        { label: '50mgp', value: 'bet_50' },
                        { label: '100mgp', value: 'bet_100' }
                    ])
            );

        // 賭け金額の選択を促すメッセージを更新
        await horseResponse.update({ content: `選択したチョコボ: ${chosenHorse}番\n次に賭け金額を選択してください。`, components: [betSelectRow] });

        const betSelection = await interaction.channel.awaitMessageComponent({
            filter: i => i.customId === 'select-bet' && i.user.id === userId,
            time: 60000
        });

        const betAmount = parseInt(betSelection.values[0].split('_')[1]);

        // mgpData.jsonからデータを読み込む
        const mgpData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

        // 現在のmgpを取得
        const currentMgp = mgpData[userId] ? mgpData[userId].mgp : 0;

        // もし掛け金が足りない場合
        if (betAmount > currentMgp) {
            return interaction.followUp("賭け金額が足りません。mgpを確認してください。");
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

        // 新しいフォローアップメッセージを送信します
        const raceMessage = await interaction.followUp({ content: "レース開始！", embeds: [embed] });

        const raceInterval = setInterval(async () => {
            for (let i = 0; i < 5; i++) {
                if (Math.random() < getWinningProbability(odds, i)) {
                    positions[i]++;
                }
                raceTrack[i] = '　'.repeat(positions[i]) + chocoboEmoji.toString();
            }

            embed.setDescription(trackOverview + '\n' + raceTrack.map((track, idx) => `${idx + 1}. ${track}`).join('\n'));
            await raceMessage.edit({ embeds: [embed] });
            const mgpData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
            const winningHorse = positions.findIndex(position => position >= maxSteps);

            if (winningHorse !== -1) {
                clearInterval(raceInterval);

                // 勝ったかどうかを確認
                const won = chosenHorse === (winningHorse + 1);

                // mgpDataからユーザーのmgpを取得
                const userMgp = mgpData[userId] ? mgpData[userId].mgp : 0;

                if (won) {
                    // 勝った場合：mgpを賭け金額にオッズを掛けた分増やす
                    mgpData[userId].mgp = userMgp + betAmount * odds[chosenHorse - 1];
                } else {
                    // 負けた場合：mgpを賭け金額分減らす
                    mgpData[userId].mgp = userMgp - betAmount;
                }

                // mgpDataを更新
                fs.writeFileSync(JSON_PATH, JSON.stringify(mgpData));

                const resultEmbed = new EmbedBuilder()
                    .setTitle("チョコボレースゲームの結果")
                    .setColor(0x0099FF)
                    .setDescription(won ?
                        `優勝は${winningHorse + 1}番です！おめでとうございます！獲得mgp: ${betAmount * odds[chosenHorse - 1]}` :
                        `優勝は${winningHorse + 1}番です。残念、失ったmgp: ${betAmount}`)
                    .setTimestamp();
                interaction.followUp({ embeds: [resultEmbed] });
            }
        }, 1000);
    }
}

