const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ButtonBuilder, ButtonStyle, Client } = require("discord.js");
const axios = require('axios')

module.exports = {
    //guild: 'guild_id', // このコマンドがギルド固有のものであれば、ギルドIDをここに入力してください
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('クラフトアイテムを検索します')
        .addStringOption(
            new SlashCommandStringOption()
                .setName('アイテム名')
                .setDescription('アイテム名を入力してください')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('データーセンター')
                .setDescription('データーセンターを入力してください')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('サーバー')
                .setDescription('サーバーを入力してください')
                .setRequired(false) // これを必須にするか、任意にするかはあなた次第です
                .setAutocomplete(true)
        ),
    /**
     * このコマンドを実行します
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    execute: async (interaction, client) => {
        await interaction.deferReply();

        const itemName = interaction.options.getString('アイテム名');
        const selectedDC = interaction.options.getString('データーセンター');
        const selectedserver = interaction.options.getString('サーバー');
        let targetServerOrDC = selectedserver ? selectedserver : selectedDC;

        const baseURL = 'https://xivapi.com';
        try {
            const response = await axios.get(`${baseURL}/search`, {
                params: {
                    string: itemName,
                    indexes: 'Recipe',
                    language: 'ja' // 検索結果は日本語で返します
                }
            });
            const recipeID = response.data.Results[0].ID;
            const rawResponse = await axios.get(`https://xivapi.com/recipe/${recipeID}`);
            const itemID = rawResponse.data.ItemResult.ID;
            const historydata = await axios.get(`https://universalis.app/api/v2/history/${targetServerOrDC}/${itemID}?entriesToReturn=25`);

            const embed = new EmbedBuilder()
                .setTitle(`${itemName}の取引履歴`)
                .setThumbnail(`https://universalis-ffxiv.github.io/universalis-assets/icon2x/${itemID}.png`)
                .setTimestamp()
                .setColor(0x0099FF)
                .setFooter({ text: 'Powerd by Universalis', iconURL: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://universalis.app/&size=16' });

            historydata.data.entries.forEach((entry, index) => {
                embed.addFields({ name: '--------------------------------------------', value: `${entry.buyerName} /${entry.worldName} | 価格: ${entry.pricePerUnit} | 個数: ${entry.quantity} | 品質: ${entry.hq ? 'HQ' : 'NQ'}\n`, inline: false });
            });
            interaction.followUp({ embeds: [embed] });
        } catch (error) {
            console.error('アイテム情報の取得中にエラーが発生しました:', error);
            await interaction.followUp('アイテム情報の取得中にエラーが発生しました。');
        }
    },


    /**
     * このコマンドがオートコンプリート機能を持つ場合、推奨オプションを応答として送信します
     * @param {AutocompleteInteraction} interaction
     * @param {Client} client
     */

    autocomplete: async (interaction, client) => {
        // インタラクションからフォーカスされているオプションを取得します
        let focused = interaction.options.getFocused(true);

        // フォーカスされているオプションが「アイテム名」かどうかを確認します
        if (focused.name === 'アイテム名') {
            // フォーカスされた値を小文字に変換します
            const searchTerm = focused.value.toLowerCase();
            try {
                // XIVAPIへ検索のAPIリクエストを送信します
                const response = await axios.get(`https://xivapi.com/search`, {
                    params: {
                        string: searchTerm,
                        indexes: 'Recipe', // 'item'インデックスで検索します
                        language: "ja" // 検索結果は日本語で返します
                    },
                });

                // APIレスポンスからアイテム名を抽出します
                const items = response.data.Results.map(item => item.Name);

                // オートコンプリートの提案数の上限を設定します
                const maxSuggestions = 25; // 必要に応じてこの数を調整できます
                const filteredItems = items
                    .filter(item => item.toLowerCase().includes(searchTerm))
                    .slice(0, maxSuggestions);

                // 上限内の一致するアイテム名を応答として送信します
                interaction.respond(
                    filteredItems.map(item => ({ name: item, value: item }))
                );
            } catch (error) {
                console.error("XIVAPIデータの取得中にエラーが発生しました:", error);
                interaction.respond("データの取得中にエラーが発生しました。");
            }
        } else if (focused.name === 'データーセンター') {
            // データセンター名の提案を追加
            const dcChoices = [
                'Japan',
                'Aether',
                'Chaos',
                'Crystal',
                'Dynamis',
                'Elemental',
                'Gaia',
                'Light',
                'Mana',
                'Materia',
                'Meteor',
                'Primal'
            ];

            const filteredDcChoices = dcChoices
                .filter(dc => dc.toLowerCase().includes(focused.value.toLowerCase()));

            interaction.respond(
                filteredDcChoices.map(dc => ({ name: dc, value: dc }))
            );
        } else if (focused.name === 'サーバー') {
            // 選択されたデータセンターに応じてサーバーのリストを取得
            const selectedDC = interaction.options.getString('データーセンター');
            const servers = getServerListByDataCenter(selectedDC);

            const filteredServers = servers.filter(server => server.toLowerCase().includes(focused.value.toLowerCase()));

            interaction.respond(
                filteredServers.map(server => ({ name: server, value: server }))
            );
        }
    }

}

function getServerListByDataCenter(dataCenter) {
    const dataCenters = {
        'Aether': ["Adamantoise", "Cactuar", "Faerie", "Gilgamesh", "Jenova", "Midgardsormr", "Sargatanas", "Siren"],
        'Chaos': ["Cerberus", "Louisoix", "Moogle", "Omega", "Phantom", "Ragnarok", "Sagittarius", "Spriggan"],
        'Crystal': ["Balmung", "Brynhildr", "Coeurl", "Diabolos", "Goblin", "Malboro", "Mateus", "Zalera"],
        'Dynamis': ["Halicarnassus", "Maduin", "Marilith", "Seraph"],
        'Elemental': ["Aegis", "Atomos", "Carbuncle", "Garuda", "Gungnir", "Kujata", "Tonberry", "Typhon"],
        'Gaia': ["Alexander", "Bahamut", "Durandal", "Fenrir", "Ifrit", "Ridill", "Tiamat", "Ultima"],
        'Light': ["Alpha", "Lich", "Odin", "Phoenix", "Raiden", "Shiva", "Twintania", "Zodiark"],
        'Mana': ["Anima", "Asura", "Chocobo", "Hades", "Ixion", "Masamune", "Pandaemonium", "Titan"],
        'Materia': ["Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan"],
        'Meteor': ["Belias", "Mandragora", "Ramuh", "Shinryu", "Unicorn", "Valefor", "Yojimbo", "Zeromus"],
        'Primal': ["Behemoth", "Excalibur", "Exodus", "Famfrit", "Hyperion", "Lamia", "Leviathan", "Ultros"],
    };

    return dataCenters[dataCenter] || [];
}



