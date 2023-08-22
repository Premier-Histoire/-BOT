const { EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } = require("discord.js");
const axios = require('axios')

module.exports = {
    //guild: 'guild_id', // このコマンドがギルド固有のものであれば、ギルドIDをここに入力してください
    data: new SlashCommandBuilder()
        .setName('craft2')
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
        ),
    /**
     * このコマンドを実行します
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    execute: async (interaction, client) => {
        await interaction.deferReply();
        let raw = '';
        let amount = "";
        let icon = '';
        const itemName = interaction.options.getString('アイテム名');
        const selectedDC = interaction.options.getString('データーセンター');
        const baseURL = 'https://xivapi.com';

        try {
            const response = await axios.get(`${baseURL}/search`, {
                params: {
                    string: itemName,
                    indexes: 'Recipe,item',
                    language: "ja"
                }
            });
            const itemID = response.data.Results[0].ID;
            const recipeID = response.data.Results[1].ID;

            const rawResponse = await axios.get(`https://xivapi.com/recipe/${recipeID}`);
            icon = "https://universalis-ffxiv.github.io/universalis-assets/icon2x/" + itemID + ".png";

            const fetchPromises = [];

            for (let i = 0; i <= 9; i++) {
                const ingredientKey = `ItemIngredient${i}`;
                const AmountIngredientkey = `AmountIngredient${i}`;
                const ingredient = rawResponse.data[ingredientKey];
                const AmountIngredient = rawResponse.data[AmountIngredientkey];

                if (ingredient) {
                    const ingredientId = ingredient.ID;
                    fetchPromises.push(
                        axios.get(`https://universalis.app/api/${selectedDC}/${ingredientId}`)
                    );
                    raw = raw + "```" + ingredient.Name_ja + "```";
                    amount = amount + "```　" + AmountIngredient + "個```";

                    const ingredientRecipeKey = `ItemIngredientRecipe${i}`;
                    const ingredientRecipe = rawResponse.data[ingredientRecipeKey];
                    if (ingredientRecipe) {
                        for (let t = 0; t <= 9; t++) {
                            const itemData = ingredientRecipe[0];
                            const subIngredientKey = `ItemIngredient${t}`;
                            const subIngredient = itemData[subIngredientKey];
                            const AmountIngredient2Key = `AmountIngredient${t}`;
                            const AmountIngredient2 = itemData[AmountIngredient2Key];

                            if (subIngredient) {
                                const subIngredientId = subIngredient.ID;
                                fetchPromises.push(
                                    axios.get(`https://universalis.app/api/${selectedDC}/${subIngredientId}`)
                                );
                                raw = raw + "　▶" + subIngredient.Name_ja + "\n";
                                amount = amount + "　　" + AmountIngredient2 + "個\n";
                            }
                        }
                    }
                }
            }

            const fetchResponses = await Promise.all(fetchPromises);

            // ここで、fetchResponsesを使用して、結果を処理および埋め込みメッセージを構築します。

            const embed = new EmbedBuilder()
                .setTitle(itemName)
                .setURL('https://google.com')
                .setThumbnail(icon)
                .setFields({
                    name: '必要素材', value: raw,
                    inline: true,
                },
                    {
                        name: '必要個数', value: amount,
                        inline: true,
                    })
                .setColor('Random')
                .setFooter({ text: 'Powerd by Universalis' })
                .setTimestamp();

            interaction.editReply({ embeds: [embed] });

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
        }
    }
}
