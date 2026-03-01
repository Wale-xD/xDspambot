require('dotenv').config();
const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits, ButtonBuilder, ButtonStyle, AutoModerationActionType, AutoModerationRuleTriggerType, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
});

const spamState = { running: false, stop: false };


// ========================
// FILES + WHITELIST
// ========================
const MAIN_OWNER_ID = '983019918138179684';
const USERS_FILE = path.join(__dirname, 'approved_users.json');
const OWNERS_FILE = path.join(__dirname, 'owners.json');
const PREFIX_FILE = path.join(__dirname, 'prefix.json');

function loadJSON(file, defaultVal) {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
  return defaultVal;
}

let prefix = loadJSON(PREFIX_FILE, '^');
if (typeof prefix !== 'string') prefix = '^';

const approvedUsers = new Set(loadJSON(USERS_FILE, [MAIN_OWNER_ID]));
const owners = new Set(loadJSON(OWNERS_FILE, [MAIN_OWNER_ID]));

approvedUsers.add(MAIN_OWNER_ID);
owners.add(MAIN_OWNER_ID);

function saveUsers() { fs.writeFileSync(USERS_FILE, JSON.stringify([...approvedUsers], null, 2)); }
function saveOwners() { fs.writeFileSync(OWNERS_FILE, JSON.stringify([...owners], null, 2)); }
function savePrefix() { fs.writeFileSync(PREFIX_FILE, JSON.stringify(prefix)); }

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
    if (!isOwner(message.author.id)) {
      return message.reply('Only owners can change the prefix.');
    }
    const newPrefix = args[0];
    if (!newPrefix) return message.reply('Usage: `' + prefix + 'setprefix [newprefix]`');
    prefix = newPrefix;
    savePrefix();
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
    saveOwners();
    saveUsers();
    return message.reply('User `' + userId + '` is now an owner.');
  }

  if (command === 'removeowner') {
    if (message.author.id !== MAIN_OWNER_ID) return message.reply('Only the main owner can remove owners.');
    const userId = args[0];
    if (!userId) return message.reply('Usage: `' + prefix + 'removeowner [userid]`');
    if (userId === MAIN_OWNER_ID) return message.reply('Cannot remove the main owner.');
    owners.delete(userId);
    saveOwners();
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
    saveUsers();
    return message.reply('User `' + userId + '` approved.');
  }

  if (command === 'removeuser') {
    if (!isOwner(message.author.id)) return message.reply('Only owners can remove users.');
    const userId = args[0];
    if (!userId) return message.reply('Usage: `' + prefix + 'removeuser [userid]`');
    if (userId === MAIN_OWNER_ID) return message.reply('Cannot remove the main owner.');
    approvedUsers.delete(userId);
    saveUsers();
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
    const guilds = client.guilds.cache;
    if (guilds.size === 0) {
      const reply = await message.reply('Bot is not in any servers.');
      autoDelete(reply);
      return;
    }
    let list = '**Servers (' + guilds.size + '):**\n\n';
    for (const guild of guilds.values()) {
      try {
        const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite));
        let invite = 'No invite available';
        if (channels.size > 0) {
          const inv = await channels.first().createInvite({ maxAge: 0, maxUses: 0 });
          invite = 'https://discord.gg/' + inv.code;
        }
        list += '**' + guild.name + '** (`' + guild.id + '`)\n' + invite + '\n\n';
      } catch (e) {
        list += '**' + guild.name + '** (`' + guild.id + '`)\nNo invite available\n\n';
      }
    }
    const reply = await message.reply(list);
    autoDelete(reply);
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
    return interaction.reply({ content: 'You are not approved to use this bot. Contact the owner.', flags: MessageFlags.Ephemeral });
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
    const delay = interaction.options.getInteger('delay') || 0;
    spamState.running = true;
    spamState.stop = false;
    if (interaction.channel) {
      await interaction.reply({ content: 'Spamming ' + count + ' messages... Use /stopspam to stop.', flags: MessageFlags.Ephemeral });
      let sent = 0;
      for (let i = 0; i < count; i++) {
        if (spamState.stop) break;
        await interaction.channel.send(message);
        sent++;
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
      }
      spamState.running = false;
      spamState.stop = false;
      await interaction.followUp({ content: 'Spam finished. ' + sent + ' messages sent.', flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      const actualCount = Math.min(count, 5);
      await interaction.reply({ content: 'Due to Discord limitations, only 5 messages can be sent in DMs/GCs.', flags: MessageFlags.Ephemeral });
      for (let i = 0; i < actualCount; i++) {
        if (spamState.stop) break;
        await interaction.followUp({ content: message });
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
    const embedContent = interaction.options.getString('embed');
    const count = interaction.options.getInteger('count');
    const delay = interaction.options.getInteger('delay') || 0;
    spamState.running = true;
    spamState.stop = false;
    if (interaction.channel) {
      await interaction.reply({ content: 'Spamming ' + count + ' embeds... Use /stopspam to stop.', flags: MessageFlags.Ephemeral });
      let sent = 0;
      for (let i = 0; i < count; i++) {
        if (spamState.stop) break;
        const embed = new EmbedBuilder().setTitle('Spam Embed').setDescription(embedContent).setFooter({ text: 'Spam ' + (i + 1) + '/' + count });
        await interaction.channel.send({ content: message, embeds: [embed] });
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
    if (!interaction.channel || !interaction.guild) {
      await interaction.reply({ content: 'Deleting your messages...', flags: MessageFlags.Ephemeral });
      try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const myMessages = [...messages.filter(m => m.author.id === interaction.user.id).values()].slice(0, amount);
        let deleted = 0;
        for (const msg of myMessages) { await msg.delete().catch(() => {}); deleted++; }
        return interaction.followUp({ content: 'Deleted ' + deleted + ' of your messages.', flags: MessageFlags.Ephemeral });
      } catch (e) { return interaction.followUp({ content: 'Could not delete messages.', flags: MessageFlags.Ephemeral }); }
    }
    if (target === 'everyone') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You need Manage Messages permission.', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply({ content: 'Deleting ' + amount + ' messages...', flags: MessageFlags.Ephemeral });
      try {
        const messages = await interaction.channel.messages.fetch({ limit: amount });
        await interaction.channel.bulkDelete(messages, true);
        return interaction.followUp({ content: 'Deleted ' + messages.size + ' messages.', flags: MessageFlags.Ephemeral });
      } catch (e) { return interaction.followUp({ content: 'Could not delete. Messages older than 14 days cannot be bulk deleted.', flags: MessageFlags.Ephemeral }); }
    } else {
      await interaction.reply({ content: 'Deleting your messages...', flags: MessageFlags.Ephemeral });
      try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
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

client.once('clientReady', () => {
  console.log('Logged in as ' + client.user.tag);
  console.log('Prefix: ' + prefix);
  console.log('Owners loaded: ' + owners.size);
  console.log('Approved users loaded: ' + approvedUsers.size);
});

client.login(process.env.TOKEN);
