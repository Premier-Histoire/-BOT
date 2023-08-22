const { MessageActionRow, MessageButton, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } = require("discord.js");
const axios = require('axios');

module.exports = {
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
            option.setName('データーセンター')
                .setDescription('データーセンターを入力してください')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('サーバー')
                .setDescription('サーバーを入力してください')
                .setRequired(false)
                .setAutocomplete(true)
        ),
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
                    indexes: 'Recipe,item',
                    language: "ja"
                }
            });
            const itemID = response.data.Results[0].ID;
            const recipeID = response.data.Results[1].ID;

            const rawResponse = await axios.get(`https://xivapi.com/recipe/${recipeID}`);
            const icon = "https://universalis-ffxiv.github.io/universalis-assets/icon2x/" + itemID + ".png";

            const ingredientPromises = [];

            for (let i = 0; i <= 9; i++) {
                const ingredientKey = `ItemIngredient${i}`;
                const ingredient = rawResponse.data[ingredientKey];
                if (ingredient) {
                    const ingredientId = ingredient.ID;
                    const universalis = 'https://universalis.app/api/v2/' + targetServerOrDC + '/' + ingredientId;
                    ingredientPromises.push(axios.get(universalis));
                }
            }

            const rawResponses = await Promise.all(ingredientPromises);

            let raw = '';
            let amount = "\n";
            let value = '';
            let sumvalue = '';

            for (let i = 0; i < rawResponses.length; i++) {
                const data = rawResponses[i].data;
                const ingredientKey = `ItemIngredient${i}`;
                const ingredient = rawResponse.data[ingredientKey];
                const AmountIngredientkey = `AmountIngredient${i}`;
                const AmountIngredient = rawResponse.data[AmountIngredientkey];

                raw += ingredient.Name_ja + "\n";
                amount += AmountIngredient + "個\n";

                value += (data.minPrice).toLocaleString().padStart('2') + "\n";
                sumvalue += (data.minPrice * AmountIngredient).toLocaleString().padStart('10') + "\n";
            }

            const embed = new EmbedBuilder()
                .setTitle(itemName)
                .setURL('https://google.com')
                .setThumbnail(icon)
                .setFields(
                    { name: '素材', value: "```" + raw + "```", inline: true },
                    { name: '個数', value: "```" + amount + "```", inline: true },
                    { name: '合計', value: "```" + sumvalue + "```", inline: true })
                .setColor('Random')
                .setFooter({ text: 'Powerd by Universalis' })
                .setTimestamp();

            interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('アイテム情報の取得中にエラーが発生しました:', error);
            await interaction.followUp('アイテム情報の取得中にエラーが発生しました。');
        }
    },
    autocomplete: async (interaction, client) => {
        let focused = interaction.options.getFocused(true);

        if (focused.name === 'アイテム名') {
            const searchTerm = focused.value.toLowerCase();
            try {
                const response = await axios.get(`https://xivapi.com/search`, {
                    params: {
                        string: searchTerm,
                        indexes: 'Recipe',
                        language: "ja"
                    },
                });
                const items = response.data.Results.map(item => item.Name);
                const maxSuggestions = 25;
                const filteredItems = items.filter(item => item.toLowerCase().includes(searchTerm)).slice(0, maxSuggestions);

                interaction.respond(filteredItems.map(item => ({ name: item, value: item })));
            } catch (error) {
                console.error("XIVAPIデータの取得中にエラーが発生しました:", error);
                interaction.respond("データの取得中にエラーが発生しました。");
            }
        } else if (focused.name === 'データーセンター') {
            const dcChoices = [
                'Japan', 'Aether', 'Chaos', 'Crystal', 'Dynamis', 'Elemental', 'Gaia', 'Light', 'Mana', 'Materia', 'Meteor', 'Primal'
            ];
            const filteredDcChoices = dcChoices.filter(dc => dc.toLowerCase().includes(focused.value.toLowerCase()));
            interaction.respond(filteredDcChoices.map(dc => ({ name: dc, value: dc })));
        } else if (focused.name === 'サーバー') {
            const selectedDC = interaction.options.getString('データーセンター');
            const servers = getServerListByDataCenter(selectedDC);
            const filteredServers = servers.filter(server => server.toLowerCase().includes(focused.value.toLowerCase()));
            interaction.respond(filteredServers.map(server => ({ name: server, value: server })));
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