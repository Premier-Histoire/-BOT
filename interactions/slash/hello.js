const { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
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
     * Executes this command
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    execute: async (interaction, client) => {
        const itemName = interaction.options.getString('アイテム名');
        const selectedDC = interaction.options.getString('データーセンター');
        const selectedserver = interaction.options.getString('サーバー');
        let targetServerOrDC = selectedserver ? selectedserver : selectedDC;
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
            const icon = "https://universalis-ffxiv.github.io/universalis-assets/icon2x/" + itemID + ".png";
            const rawResponse = await axios.get(`https://xivapi.com/recipe/${recipeID}`);

            const ingredientPromises = [];
            const ingredients = [];

            for (let i = 0; i <= 9; i++) {
                const ingredientKey = `ItemIngredient${i}`;
                const ingredient = rawResponse.data[ingredientKey];
                const AmountIngredientkey = `AmountIngredient${i}`;
                const AmountIngredient = rawResponse.data[AmountIngredientkey];

                if (ingredient) {
                    const ingredientId = ingredient.ID;
                    const universalis = 'https://universalis.app/api/v2/' + targetServerOrDC + '/' + ingredientId;
                    ingredientPromises.push(axios.get(universalis).then(response => {
                        return {
                            name: ingredient.Name,
                            amount: AmountIngredient,
                            value: response.data.PricePerUnit
                        };
                    }));
                }
            }

            const ingredientResponses = await Promise.all(ingredientPromises);

            ingredientResponses.forEach((ingredient, index) => {
                ingredients[index] = {
                    icon: icon,
                    [`素材${index + 1}`]: ingredient.name,
                    amount: ingredient.amount,
                    value: ingredient.value
                };
            });

            console.log(ingredients);

        } catch (error) {
            console.error('アイテム情報の取得中にエラーが発生しました:', error);
            await interaction.followUp('アイテム情報の取得中にエラーが発生しました。');
        }

        const numOfPages = 5; // ここでページ数を指定します
        const pages = Array.from({ length: numOfPages }, (_, i) => {
            return `This is page ${i + 1}.`;
        });

        let currentPage = 0;

        const updateMessage = (page) => {
            const components = [];

            if (page > 0) {
                components.push(new ButtonBuilder()
                    .setCustomId(`previous_page`)
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Secondary));
            }

            if (page < pages.length - 1) {
                components.push(new ButtonBuilder()
                    .setCustomId(`next_page`)
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Secondary));
            }

            interaction.editReply({
                content: pages[page],
                components: [new ActionRowBuilder().setComponents(components)]
            });
        };

        interaction.reply({
            content: pages[currentPage],
            components: [
                new ActionRowBuilder()
                    .setComponents([
                        new ButtonBuilder()
                            .setCustomId(`previous_page`)
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`next_page`)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });

        // この部分はメインのbotファイルに移動するか、一度だけ実行される場所に配置する必要があります。
        client.on('interactionCreate', async (buttonInteraction) => {
            if (!buttonInteraction.isButton()) return;
            if (buttonInteraction.user.id !== interaction.user.id) return; // ユーザーの制限

            if (buttonInteraction.customId === 'previous_page' && currentPage > 0) {
                currentPage--;
                updateMessage(currentPage);
                await buttonInteraction.deferUpdate();
            } else if (buttonInteraction.customId === 'next_page' && currentPage < pages.length - 1) {
                currentPage++;
                updateMessage(currentPage);
                await buttonInteraction.deferUpdate();
            }
        });
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

function ensureIngredientLevel(level) {
    if (!ingredients[level]) {
        ingredients[level] = {};
    }
}