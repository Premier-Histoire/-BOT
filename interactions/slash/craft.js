const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ButtonBuilder, ButtonStyle, Client } = require("discord.js");
const axios = require('axios')

module.exports = {
    //guild: 'guild_id', // このコマンドがギルド固有のものであれば、ギルドIDをここに入力してください
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('クラフトアイテムを検索します')
        .addStringOption(
            new SlashCommandStringOption()
                .setName('アイテム名')
                .setDescription('アイテム名を入力してください')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
                .setName('品質')
                .setDescription('作成品の品質を選択してください')
                .setRequired(true) //trueで必須、falseで任意
                .setRequired(true)
                .addChoices(
                    { name: 'HQ', value: 'minPriceHQ' })
                .addChoices({
                    name: 'NQ',
                    value: 'minPriceNQ'
                })
                .addChoices({
                    name: 'ALL',
                    value: 'minPrice'
                })
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
        const quality = interaction.options.getString('品質');
        const selectedDC = interaction.options.getString('データーセンター');
        const selectedserver = interaction.options.getString('サーバー');
        let targetServerOrDC = selectedserver ? selectedserver : selectedDC;
        let subRaw = 0;
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
            const itemvalue = await axios.get(`https://universalis.app/api/${selectedDC}/${itemID}`)
            const itemvaluedata = itemvalue.data

            const ingredientPromises = [];
            const ingredients = {
                '0': {
                    name: itemName,
                    id: itemID,
                    value: itemvaluedata[quality]
                }
            };
            let num = 0;
            for (let i = 0; i <= 9; i++) {
                const ingredientKey = `ItemIngredient${i}`;
                const ingredient = rawResponse.data[ingredientKey];
                const AmountIngredientkey = `AmountIngredient${i}`;
                const AmountIngredient = rawResponse.data[AmountIngredientkey];

                if (ingredient) {
                    const ingredientId = ingredient.ID;
                    const ingredientRecipeKey = `ItemIngredientRecipe${i}`;
                    const ingredientRecipe = rawResponse.data[ingredientRecipeKey];
                    const itemvalue2 = await axios.get(`https://universalis.app/api/${selectedDC}/${ingredientId}`)
                    const itemvalue2data = itemvalue2.data
                    if (ingredientRecipe) {
                        num = num + 1;
                        ingredients[num] = {
                            name: ingredient.Name_ja,
                            id: ingredientId,
                            value: itemvalue2data[quality]
                        };
                        subRaw = subRaw + 1;
                        const currentSubRaw = subRaw;
                        for (let t = 0; t <= 9; t++) {
                            const itemData = ingredientRecipe[0];
                            const subIngredientKey = `ItemIngredient${t}`;
                            const subIngredient = itemData[subIngredientKey];
                            const AmountIngredient2Key = `AmountIngredient${t}`;
                            const AmountIngredient2 = itemData[AmountIngredient2Key];
                            if (subIngredient) {
                                const subIngredientId = subIngredient.ID;
                                ingredientPromises.push(
                                    axios.get(`https://universalis.app/api/${selectedDC}/${subIngredientId}`)
                                        .then(response => {
                                            return {
                                                type: currentSubRaw.toString(),
                                                id: subIngredientId,
                                                name: subIngredient.Name_ja,
                                                amount: AmountIngredient2,
                                                value: response.data.minPrice
                                            };
                                        })
                                );
                            }
                        }
                    }
                    const universalis = 'https://universalis.app/api/v2/' + targetServerOrDC + '/' + ingredientId;
                    ingredientPromises.push(axios.get(universalis).then(response => {
                        return {
                            type: '0',
                            id: ingredient.ID,
                            name: ingredient.Name_ja,
                            amount: AmountIngredient,
                            value: response.data.minPrice
                        };
                    }));
                }
            }

            const ingredientResponses = await Promise.all(ingredientPromises);

            ingredientResponses.forEach((ingredient) => {
                const rawKey = `raw${Object.keys(ingredients[ingredient.type]).length - 2}`;
                ingredients[ingredient.type][rawKey] = {
                    id: ingredient.id,
                    name: ingredient.name,
                    amount: ingredient.amount,
                    value: ingredient.value
                };
            });

            console.log(ingredients);

            const embedPages = generateEmbedPages(ingredients);
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('⮜')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('⮞')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.followUp({ embeds: [embedPages[0]], components: [row] });

            const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

            let currentIndex = 0;
            collector.on('collect', async i => {
                if (i.customId === 'previous') {
                    currentIndex--;
                } else if (i.customId === 'next') {
                    currentIndex++;
                }

                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('⮜')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentIndex === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('⮞')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentIndex === embedPages.length - 1)
                    );

                await i.update({ embeds: [embedPages[currentIndex]], components: [newRow] });
            });

            collector.on('end', collected => {
                // ページネーションが終了したときの処理（例：ボタンを無効化するなど）
            });

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

function generateEmbedPages(ingredients) {
    const embeds = [];

    const mainIngredient = ingredients[0];

    for (const ingredientKey in ingredients) {
        const ingredient = ingredients[ingredientKey];

        if (ingredient && Object.keys(ingredient).length !== 0) {
            const embed = new EmbedBuilder()
                .setTitle(`${ingredient.name}`)
                .setURL(`https://universalis.app/market/${ingredient.id}`)
                .setDescription('★マークは製作したほうが安いアイテムです。')
                .setThumbnail(`https://universalis-ffxiv.github.io/universalis-assets/icon2x/${ingredient.id}.png`)
                .setColor(0x0099FF)
                .setTimestamp()
                .setFooter({ text: 'Powerd by Universalis', iconURL: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://universalis.app/&size=16' });

            const names = [];
            const amounts = ['\n'];
            const values = [];
            let subIngredientsTotalValue = 0; // サブ材料の合計価格
            let mainIngredientValue = 0; // 主要材料の価格

            for (let i = 1; i <= 10; i++) {
                const rawKey = `raw${i}`;
                const subIngredient = ingredient[rawKey];
                if (subIngredient) {
                    names.push(subIngredient.name);
                    amounts.push(subIngredient.amount);
                    subIngredientsTotalValue += subIngredient.value * subIngredient.amount;
                    mainIngredientValue = ingredient.value;

                    if (ingredientKey === '0') {

                        let alternativeValue = 0;
                        let matched = false;

                        for (const altKey in ingredients) {
                            if (altKey !== '0' && ingredients[altKey].name === subIngredient.name) {
                                matched = true;
                                for (let j = 1; j <= 10; j++) {
                                    const altRawKey = `raw${j}`;
                                    const altSubIngredient = ingredients[altKey][altRawKey];
                                    if (altSubIngredient) {
                                        alternativeValue += altSubIngredient.value * altSubIngredient.amount;
                                    }
                                }
                            }
                        }

                        if (matched && alternativeValue < subIngredient.value * subIngredient.amount) {
                            values.push("★" + `${alternativeValue} ギル`);
                        } else {
                            values.push(`${subIngredient.value * subIngredient.amount} ギル`);
                        }
                    } else {
                        values.push(`${subIngredient.value * subIngredient.amount} ギル`);
                    }
                }
            }

            // 最大の価格文字列の長さを取得
            const maxLength = Math.max(...values.map(v => v.length));

            // 価格文字列を右寄せに整形
            const valueL = values.map(v => v.padStart(maxLength, ' '));

            embed.addFields(
                { name: '必要素材', value: "```" + names.join('\n') + "```", inline: true },
                { name: '個数', value: "```" + amounts.join('\n') + "```", inline: true },
                { name: '価格', value: "```" + valueL.join('\n') + "```", inline: true }
            );

            // 利益率の計算と表示

            const profitRate = ((mainIngredientValue - subIngredientsTotalValue) / subIngredientsTotalValue) * 100;
            embed.addFields(
                { name: 'マケボ価格', value: "```" + `${mainIngredientValue} ギル` + "```", inline: false },
                { name: '原価', value: "```" + `${subIngredientsTotalValue} ギル` + "```", inline: false },
                { name: '利益率', value: "```" + `${profitRate.toFixed(2)}%` + "```", inline: false }
            );


            embeds.push(embed);
        }
    }

    return embeds;
}



