const { SlashCommandBuilder, ChatInputCommandInteraction, GatewayIntentBits, SlashCommandStringOption, AutocompleteInteraction, GuildEmoji, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } = require("discord.js");
const axios = require('axios')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('エオルゼア経済大学の使い方')
        .addStringOption(
            new SlashCommandStringOption()
                .setName('キャラ名')
                .setDescription('キャラ名を入力してください')
                .setRequired(true)
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
                .setRequired(true) // これを必須にするか、任意にするかはあなた次第です
                .setAutocomplete(true)
        ),
    /**
     * Executes this command
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */

    execute: async (interaction, client) => {
        await interaction.deferReply();
        const baseURL = 'https://xivapi.com';
        const characterName = interaction.options.getString('キャラ名');
        const selectedDC = interaction.options.getString('データーセンター');
        const selectedServer = interaction.options.getString('サーバー');
        const targetServerOrDC = selectedServer || selectedDC;
        let Avatar
        const jobNameMapping = {
            'gladiator': '剣術士',
            'paladin': 'ナイト',
            'marauder': '斧術士',
            'warrior': '戦士',
            'dark knight': '暗黒騎士',
            'gunbreaker': 'ガンブレ',
            'conjurer': '幻術士',
            'white mage': '白魔道士',
            'arcanist': '巴術士',
            'scholar': '学者',
            'astrologian': '占星術師',
            'sage': '賢者',
            'pugilist': '格闘士',
            'monk': 'モンク',
            'lancer': '槍術士',
            'dragoon': '竜騎士',
            'rogue': '双剣士',
            'ninja': '忍者',
            'samurai': '侍',
            'reaper': 'リーパー',
            'archer': '弓術士',
            'bard': '吟遊詩人',
            'machinist': '機工士',
            'dancer': '踊り子',
            'thaumaturge': '呪術士',
            'black mage': '黒魔道士',
            'summoner': '召喚士',
            'red mage': '赤魔道士',
            'blue mage': '青魔道士',
            'carpenter': '木工師',
            'blacksmith': '鍛冶師',
            'armorer': '甲冑師',
            'goldsmith': '彫金師',
            'leatherworker': '革細工師',
            'weaver': '裁縫師',
            'alchemist': '錬金術師',
            'culinarian': '調理師',
            'miner': '採掘師',
            'botanist': '園芸師',
            'fisher': '釣師'
        };

        const jobRoleMapping = {
            'gladiator': 'Tank',
            'paladin': 'Tank',
            'marauder': 'Tank',
            'warrior': 'Tank',
            'dark knight': 'Tank',
            'gunbreaker': 'Tank',

            'conjurer': 'Healer',
            'white mage': 'Healer',
            'arcanist': 'Healer',
            'scholar': 'Healer',
            'astrologian': 'Healer',
            'sage': 'Healer',

            'pugilist': 'Melee DPS',
            'monk': 'Melee DPS',
            'lancer': 'Melee DPS',
            'dragoon': 'Melee DPS',
            'rogue': 'Melee DPS',
            'ninja': 'Melee DPS',
            'samurai': 'Melee DPS',
            'reaper': 'Melee DPS',

            'archer': 'Physical Ranged DPS',
            'bard': 'Physical Ranged DPS',
            'machinist': 'Physical Ranged DPS',
            'dancer': 'Physical Ranged DPS',

            'thaumaturge': 'Magical Ranged DPS',
            'black mage': 'Magical Ranged DPS',
            'arcanist': 'Magical Ranged DPS',
            'summoner': 'Magical Ranged DPS',
            'red mage': 'Magical Ranged DPS',
            'blue mage': 'Magical Ranged DPS',

            'carpenter': 'Crafter',
            'blacksmith': 'Crafter',
            'armorer': 'Crafter',
            'goldsmith': 'Crafter',
            'leatherworker': 'Crafter',
            'weaver': 'Crafter',
            'alchemist': 'Crafter',
            'culinarian': 'Crafter',

            'miner': 'Gatherer',
            'botanist': 'Gatherer',
            'fisher': 'Gatherer'
        };

        const rolesData = {
            'Tank': {},
            'Healer': {},
            'Melee DPS': {},
            'Physical Ranged DPS': {},
            'Magical Ranged DPS': {},
            'Crafter': {},
            'Gatherer': {},
            'Unknown': {}
        };

        async function fetchCharacterData() {
            try {
                const searchResponse = await axios.get(`${baseURL}/character/search`, {
                    params: {
                        name: characterName,
                        server: targetServerOrDC
                    }
                });

                if (!searchResponse.data.Results.length) {
                    interaction.reply('該当するキャラクターが見つかりませんでした。');
                    return;
                }

                const characterID = searchResponse.data.Results[0].ID;
                const detailsResponse = await axios.get(`${baseURL}/character/${characterID}`);
                const characterDetails = detailsResponse.data.Character;
                Avatar = characterDetails.Avatar

                if (characterDetails.ClassJobs) {
                    characterDetails.ClassJobs.forEach(classJob => {
                        let jobName = classJob.Name;
                        if (classJob.Level >= 30 && jobName.includes('/')) {
                            jobName = jobName.split('/')[1].trim().toLowerCase();
                        }
                        const guild = interaction.guild;
                        const role = jobRoleMapping[jobName.toLowerCase()] || 'Unknown';
                        const emojiJobName = jobName.replace(/\s+/g, '');
                        const emoji = guild.emojis.cache.find(e => e.name.toLowerCase() === emojiJobName.toLowerCase());

                        const japaneseJobName = jobNameMapping[jobName] || jobName;

                        rolesData[role][japaneseJobName] = {
                            "icon": emoji ? `<:${emoji.name}:${emoji.id}>` : '',
                            "Lv": classJob.Level
                        };
                    });
                } else {
                    console.log('ジョブの情報がありません。');
                }

                console.log(rolesData);

            } catch (error) {
                console.error('情報の取得中にエラーが発生しました:', error);
                interaction.reply('情報の取得中にエラーが発生しました。');
            }
        }

        fetchCharacterData();

        const { MessageEmbed } = require('discord.js');

        // rolesData から Embed を作成
        const createEmbedFromRolesData = (rolesData) => {
            const embed = new EmbedBuilder()
                .setTitle(`${characterName} のジョブ情報`)
                .setThumbnail(Avatar)
                .setColor(0x3498db);

            const roleOrder = [
                'Tank', 'Healer', ' ',
                'Melee DPS', 'Physical Ranged DPS', 'Magical Ranged DPS',
                'Crafter', 'Gatherer', ' ',
            ];

            roleOrder.forEach(role => {
                if (role === ' ') {
                    embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
                } else if (rolesData[role] && Object.keys(rolesData[role]).length > 0) {
                    let jobInfoText = '';
                    for (const [jobName, jobDetails] of Object.entries(rolesData[role])) {
                        let adjustedJobName = jobName;

                        // jobNameの文字数を計算
                        const charCount = Array.from(jobName).length;

                        // 全角7文字になるように全角空白を追加
                        for (let i = charCount; i < 4; i++) {
                            adjustedJobName += '\u3000';
                        }

                        jobInfoText += `${jobDetails.icon}${adjustedJobName}-Lv.${jobDetails.Lv}\n`;
                    }
                    embed.addFields({ name: role, value: jobInfoText, inline: true });
                }
            });

            return embed;
        }

        async function execute() {
            await fetchCharacterData(); // fetchCharacterData が完了するのを待つ

            const characterEmbed = createEmbedFromRolesData(rolesData);
            interaction.followUp({ embeds: [characterEmbed] });
        }

        // 非同期関数を実行
        execute();
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
        if (focused.name === 'データーセンター') {
            // データセンター名の提案を追加
            const dcChoices = [
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
