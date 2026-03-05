require('dotenv').config();
const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits, ButtonBuilder, ButtonStyle, AutoModerationActionType, AutoModerationRuleTriggerType, ChannelType } = require('discord.js');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } = require('firebase/firestore');

// Firebase init
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
});

const spamState = { running: false, stop: false };

const MAIN_OWNER_ID = '983019918138179684';
let contactOwner = '';

// In-memory cache (loaded from Firebase on startup)
let approvedUsers = new Set([MAIN_OWNER_ID]);
let owners = new Set([MAIN_OWNER_ID]);
let prefix = '^';

// ========================
// FIREBASE HELPERS
// ========================
async function loadFromDB() {
  try {
    const dataDoc = await getDoc(doc(db, 'bot', 'data'));
    if (dataDoc.exists()) {
      const data = dataDoc.data();
      if (data.approvedUsers) approvedUsers = new Set(data.approvedUsers);
      if (data.owners) owners = new Set(data.owners);
      if (data.prefix) prefix = data.prefix;
      if (data.contactOwner) contactOwner = data.contactOwner;
    } else {
      // First run — create the document with defaults
      await setDoc(doc(db, 'bot', 'data'), {
        approvedUsers: [MAIN_OWNER_ID],
        owners: [MAIN_OWNER_ID],
        prefix: '^',
        contactOwner: ''
      });
    }
    // Always ensure main owner is in both sets
    approvedUsers.add(MAIN_OWNER_ID);
    owners.add(MAIN_OWNER_ID);
    console.log('Firebase data loaded successfully.');
  } catch (e) {
    console.error('Failed to load from Firebase:', e.message);
  }
}

async function saveApprovedUsers() {
  await updateDoc(doc(db, 'bot', 'data'), { approvedUsers: [...approvedUsers] });
}
async function saveOwners() {
  await updateDoc(doc(db, 'bot', 'data'), { owners: [...owners] });
}
async function savePrefix() {
  await updateDoc(doc(db, 'bot', 'data'), { prefix: prefix });
}
async function saveContactOwner() {
  await updateDoc(doc(db, 'bot', 'data'), { contactOwner: contactOwner });
}

// ========================
// HELPERS
// ========================
function isOwner(userId) { return owners.has(userId); }

function isApproved(interaction) {
  const userId = interaction.user?.id || interaction.author?.id;
  if (isOwner(userId)) return true;
  if (approvedUsers.has(userId)) return true;
  return false;
}

function autoDelete(msg, ms = 60000) {
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

// ========================
// PREFIX COMMANDS
// ========================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'setprefix') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can change the prefix.');
    const newPrefix = args[0];
    if (!newPrefix) return message.reply('Usage: `' + prefix + 'setprefix [newprefix]`');
    prefix = newPrefix;
    await savePrefix();
    return message.reply('Prefix changed to `' + prefix + '`');
  }

  if (command === 'setstatus') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can use this command.');
    const status = args.join(' ');
    if (!status) return message.reply('Usage: `' + prefix + 'setstatus [text]`');
    client.user.setPresence({ activities: [{ name: status, type: 0 }], status: 'online' });
    return message.reply('Status set to: **' + status + '**');
  }

  if (command === 'removestatus') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can use this command.');
    client.user.setPresence({ activities: [], status: 'online' });
    return message.reply('Status removed.');
  }

  if (command === 'addowner') {
    if (message.author.id !== MAIN_OWNER_ID) return message.reply('Only the main owner can add owners.');
    const userId = args[0];
    if (!userId) return message.reply('Usage: `' + prefix + 'addowner [userid]`');
    owners.add(userId);
    approvedUsers.add(userId);
    await saveOwners();
    await saveApprovedUsers();
    return message.reply('User `' + userId + '` is now an owner.');
  }

  if (command === 'removeowner') {
    if (message.author.id !== MAIN_OWNER_ID) return message.reply('Only the main owner can remove owners.');
    const userId = args[0];
    if (!userId) return message.reply('Usage: `' + prefix + 'removeowner [userid]`');
    if (userId === MAIN_OWNER_ID) return message.reply('Cannot remove the main owner.');
    owners.delete(userId);
    await saveOwners();
    return message.reply('User `' + userId + '` is no longer an owner.');
  }

  if (command === 'ownerslist') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can use this command.');
    const lines = [];
    for (const userId of owners) {
      try {
        const user = await client.users.fetch(userId);
        lines.push('**' + user.username + '** (`' + userId + '`) ' + (userId === MAIN_OWNER_ID ? '👑 Main Owner' : 'Owner'));
      } catch (e) {
        lines.push('Unknown (`' + userId + '`) ' + (userId === MAIN_OWNER_ID ? '👑 Main Owner' : 'Owner'));
      }
    }
    const reply = await message.reply('**Owners List:**\n\n' + (lines.join('\n') || 'None'));
    autoDelete(reply);
  }

  if (command === 'approveuser') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can approve users.');
    const userId = args[0];
    if (!userId) return message.reply('Usage: `' + prefix + 'approveuser [userid]`');
    approvedUsers.add(userId);
    await saveApprovedUsers();
    return message.reply('User `' + userId + '` approved.');
  }

  if (command === 'removeuser') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can remove users.');
    const userId = args[0];
    if (!userId) return message.reply('Usage: `' + prefix + 'removeuser [userid]`');
    if (userId === MAIN_OWNER_ID) return message.reply('Cannot remove the main owner.');
    approvedUsers.delete(userId);
    await saveApprovedUsers();
    return message.reply('User `' + userId + '` removed.');
  }

  if (command === 'approvedlist') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can view this.');
    const lines = [];
    for (const userId of approvedUsers) {
      try {
        const user = await client.users.fetch(userId);
        lines.push('**' + user.username + '** (`' + userId + '`)');
      } catch (e) { lines.push('Unknown (`' + userId + '`)'); }
    }
    const reply = await message.reply('**Approved Users:**\n\n' + (lines.join('\n') || 'None'));
    autoDelete(reply);
  }

  if (command === 'serverlist') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can use this command.');
    const guilds = [...client.guilds.cache.values()];
    if (guilds.length === 0) {
      const reply = await message.reply('Bot is not in any servers.');
      autoDelete(reply);
      return;
    }

    const perPage = 7;
    const totalPages = Math.ceil(guilds.length / perPage);

    async function buildEmbed(page) {
      const start = page * perPage;
      const pageGuilds = guilds.slice(start, start + perPage);
      let description = '';
      for (const guild of pageGuilds) {
        try {
          const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite));
          let invite = 'No invite available';
          if (channels.size > 0) {
            const inv = await channels.first().createInvite({ maxAge: 0, maxUses: 0 });
            invite = '<https://discord.gg/' + inv.code + '>';
          }
          description += '**' + guild.name + '**\n`' + guild.id + '` • ' + invite + '\n\n';
        } catch (e) {
          description += '**' + guild.name + '**\n`' + guild.id + '` • No invite available\n\n';
        }
      }
      return new EmbedBuilder()
        .setTitle('Servers (' + guilds.length + ' total)')
        .setDescription(description)
        .setFooter({ text: 'Page ' + (page + 1) + ' of ' + totalPages })
        .setColor(0x5865F2);
    }

    function buildButtons(page) {
      const row = new ActionRowBuilder();
      row.addComponents(
        new ButtonBuilder().setCustomId('sl_prev_' + page).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('sl_next_' + page).setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
      );
      return row;
    }

    const embed = await buildEmbed(0);
    const reply = await message.reply({ embeds: [embed], components: totalPages > 1 ? [buildButtons(0)] : [] });
    autoDelete(reply);

    if (totalPages > 1) {
      const collector = reply.createMessageComponentCollector({ time: 60000 });
      collector.on('collect', async btn => {
        if (btn.user.id !== message.author.id) return btn.reply({ content: 'Only the command user can use these buttons.', flags: MessageFlags.Ephemeral });
        const parts = btn.customId.split('_');
        const action = parts[1];
        const currentPage = parseInt(parts[2]);
        const newPage = action === 'next' ? currentPage + 1 : currentPage - 1;
        const newEmbed = await buildEmbed(newPage);
        await btn.update({ embeds: [newEmbed], components: [buildButtons(newPage)] });
      });
      collector.on('end', () => { reply.edit({ components: [] }).catch(() => {}); });
    }
  }

  if (command === 'setcontactowner') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can use this command.');
    const name = args.join(' ');
    if (!name) return message.reply('Usage: `' + prefix + 'setcontactowner [name/tag]`');
    contactOwner = name;
    await saveContactOwner();
    return message.reply('Contact owner set to: **' + contactOwner + '**');
  }

  if (command === 'getautomodbadge') {
    if (message.author.id !== MAIN_OWNER_ID) return message.reply('Only the main owner can use this command.');
    if (!message.guild) return message.reply('This command only works in a server.');
    const amount = Math.min(parseInt(args[0]) || 100, 100);
    if (isNaN(amount) || amount < 1) return message.reply('Please provide a valid number. Example: `^getautomodbadge 50`');
    await message.reply('Creating ' + amount + ' automod rules...');
    let created = 0;
    let failed = 0;
    for (let i = 1; i <= amount; i++) {
      try {
        await message.guild.autoModerationRules.create({
          name: 'AutoMod Rule ' + i,
          eventType: 1,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: { keywordFilter: ['badword' + i + 'xyz' + Math.random().toString(36).slice(2, 6)] },
          actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Rule ' + i + ' triggered.' } }],
          enabled: true
        });
        created++;
      } catch (e) { failed++; }
      await new Promise(r => setTimeout(r, 300));
    }
    return message.reply('Done! Created ' + created + ' rules. Failed: ' + failed + '.');
  }
});

// ========================
// SLASH COMMANDS
// ========================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (!isApproved(interaction)) {
    const ownerMsg = contactOwner ? 'You are not whitelisted. Please contact the owner @' + contactOwner : 'You are not whitelisted. Please contact the owner.';
    return interaction.reply({ content: ownerMsg, flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'ban') {
    const modal = new ModalBuilder()
      .setCustomId('banModal')
      .setTitle('Fake Ban Confirmation')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('banUser').setLabel('User to ban').setPlaceholder('Enter username').setStyle(TextInputStyle.Short)
      ));
    await interaction.showModal(modal);
    interaction.awaitModalSubmit({ filter: i => i.customId === 'banModal', time: 60000 }).then(async (m) => {
      const userToBan = m.fields.getTextInputValue('banUser');
      await m.reply({ content: 'Banning ' + userToBan + '...', flags: MessageFlags.Ephemeral });
      setTimeout(async () => {
        if (m.channel) await m.channel.send(':hammer: User ' + userToBan + ' has been banned.');
        else await m.followUp(':hammer: User ' + userToBan + ' has been banned.');
      }, 1000);
    }).catch(() => {});
  }

  if (interaction.commandName === 'spamraid') {
    if (spamState.running) return interaction.reply({ content: 'A spam is already running. Use /stopspam first.', flags: MessageFlags.Ephemeral });
    const message = interaction.options.getString('message');
    const count = interaction.options.getInteger('count');
    const lines = Math.min(interaction.options.getInteger('lines') || 1, 50);
    const delay = interaction.options.getInteger('delay') || 0;
    const builtMessage = Array(lines).fill(message).join('\n');
    spamState.running = true;
    spamState.stop = false;
    const inServer = interaction.guildId !== null;
    // Try to get channel — works when bot is in server, or as external app
    const channel = interaction.channel || await client.channels.fetch(interaction.channelId).catch(() => null);

    if (inServer && channel) {
      // Server with channel access — send unlimited independent messages
      await interaction.reply({ content: 'Spamming ' + count + ' messages (' + lines + ' lines each)... Use /stopspam to stop.', flags: MessageFlags.Ephemeral });
      let sent = 0;
      for (let i = 0; i < count; i++) {
        if (spamState.stop) break;
        await channel.send(builtMessage);
        sent++;
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
      }
      spamState.running = false;
      spamState.stop = false;
      await interaction.followUp({ content: 'Spam finished. ' + sent + ' messages sent (' + (sent * lines) + ' total lines).', flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      // DM/GC or no channel access — limited to 5 followUps
      const actualCount = Math.min(count, 5);
      await interaction.reply({ content: 'Due to Discord limitations, only 5 messages can be sent in DMs/GCs.', flags: MessageFlags.Ephemeral });
      for (let i = 0; i < actualCount; i++) {
        if (spamState.stop) break;
        await interaction.followUp({ content: builtMessage });
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
      }
      spamState.running = false;
      spamState.stop = false;
    }
  }

  if (interaction.commandName === 'stopspam') {
    if (!spamState.running) return interaction.reply({ content: 'No spam is running.', flags: MessageFlags.Ephemeral });
    spamState.stop = true;
    spamState.running = false;
    return interaction.reply({ content: 'Spam stopped.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'embedspam') {
    if (spamState.running) return interaction.reply({ content: 'A spam is already running. Use /stopspam first.', flags: MessageFlags.Ephemeral });
    const message = interaction.options.getString('message');
    const embedContent = interaction.options.getString('embed') || '';
    const embedImage = interaction.options.getString('image') || null;
    const count = interaction.options.getInteger('count');
    const delay = interaction.options.getInteger('delay') || 0;
    spamState.running = true;
    spamState.stop = false;
    const inServerE = interaction.guildId !== null;
    const channelE = interaction.channel || await client.channels.fetch(interaction.channelId).catch(() => null);
    if (inServerE && channelE) {
      await interaction.reply({ content: 'Spamming ' + count + ' embeds... Use /stopspam to stop.', flags: MessageFlags.Ephemeral });
      let sent = 0;
      for (let i = 0; i < count; i++) {
        if (spamState.stop) break;
        const embed = new EmbedBuilder().setTitle('Spam Embed').setDescription(embedContent).setFooter({ text: 'Spam ' + (i + 1) + '/' + count });
        if (embedImage) embed.setImage(embedImage);
        await channelE.send({ content: message, embeds: [embed] });
        sent++;
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
      }
      spamState.running = false;
      spamState.stop = false;
      await interaction.followUp({ content: 'Spam finished. ' + sent + ' sent.', flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      const actualCount = Math.min(count, 5);
      await interaction.reply({ content: 'Due to Discord limitations, only 5 messages can be sent in DMs/GCs.', flags: MessageFlags.Ephemeral });
      for (let i = 0; i < actualCount; i++) {
        if (spamState.stop) break;
        const embed = new EmbedBuilder().setTitle('Spam Embed').setDescription(embedContent).setFooter({ text: 'Spam ' + (i + 1) + '/' + actualCount });
        if (embedImage) embed.setImage(embedImage);
        await interaction.followUp({ content: message, embeds: [embed] });
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
      }
      spamState.running = false;
      spamState.stop = false;
    }
  }

  if (interaction.commandName === 'purge') {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getString('target');
    if (!interaction.guildId) {
      return interaction.reply({ content: 'Purge only works in servers. Discord does not allow bots to delete messages in DMs/GCs.', flags: MessageFlags.Ephemeral });
    }
    const channel = await client.channels.fetch(interaction.channelId).catch(() => null);
    if (!channel) return interaction.reply({ content: 'Could not access this channel.', flags: MessageFlags.Ephemeral });
    if (target === 'everyone') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You need Manage Messages permission.', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply({ content: 'Deleting ' + amount + ' messages...', flags: MessageFlags.Ephemeral });
      try {
        const messages = await channel.messages.fetch({ limit: amount });
        await channel.bulkDelete(messages, true);
        return interaction.followUp({ content: 'Deleted ' + messages.size + ' messages.', flags: MessageFlags.Ephemeral });
      } catch (e) { return interaction.followUp({ content: 'Could not delete. Messages older than 14 days cannot be bulk deleted.', flags: MessageFlags.Ephemeral }); }
    } else {
      await interaction.reply({ content: 'Deleting your messages...', flags: MessageFlags.Ephemeral });
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const myMessages = [...messages.filter(m => m.author.id === interaction.user.id).values()].slice(0, amount);
        let deleted = 0;
        for (const msg of myMessages) { await msg.delete().catch(() => {}); deleted++; }
        return interaction.followUp({ content: 'Deleted ' + deleted + ' of your messages.', flags: MessageFlags.Ephemeral });
      } catch (e) { return interaction.followUp({ content: 'Could not delete messages.', flags: MessageFlags.Ephemeral }); }
    }
  }

  if (interaction.commandName === 'nitro') {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const giftCode = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const giftLink = 'https://discord.gift/' + giftCode;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2).setTitle('A wild gift appears!')
      .setDescription('**Discord Nitro**\nExpires in 48 hours')
      .setThumbnail('https://i.imgur.com/w9aiD6F.png')
      .setFooter({ text: 'Discord Nitro' });
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Claim').setStyle(ButtonStyle.Link).setURL(giftLink).setEmoji('🎁')
    );
    if (interaction.channel) {
      await interaction.reply({ content: 'Sent!', flags: MessageFlags.Ephemeral });
      return interaction.channel.send({ content: '🎉 **You have been gifted a gift!**\n' + giftLink, embeds: [embed], components: [button] });
    } else {
      return interaction.reply({ content: '🎉 **You have been gifted a gift!**\n' + giftLink, embeds: [embed], components: [button] });
    }
  }
});

client.once('clientReady', async () => {
  await loadFromDB();
  console.log('Logged in as ' + client.user.tag);
  console.log('Prefix: ' + prefix);
  console.log('Owners: ' + owners.size);
  console.log('Approved users: ' + approvedUsers.size);
});

client.login(process.env.TOKEN);
