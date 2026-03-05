require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Fake ban a user')
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),

  new SlashCommandBuilder()
    .setName('spamraid')
    .setDescription('Send repeated messages')
    .addStringOption(o => o.setName('message').setDescription('The message to spam').setRequired(true))
    .addIntegerOption(o => o.setName('count').setDescription('How many times to send').setRequired(true))
    .addIntegerOption(o => o.setName('lines').setDescription('How many times to repeat the message per send (default 1)').setRequired(false))
    .addIntegerOption(o => o.setName('delay').setDescription('Delay in seconds between messages').setRequired(false))
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),

  new SlashCommandBuilder()
    .setName('stopspam')
    .setDescription('Stop the currently running spam')
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),

  new SlashCommandBuilder()
    .setName('embedspam')
    .setDescription('Send repeated embed messages')
    .addStringOption(o => o.setName('message').setDescription('The message to send with the embed').setRequired(true))
    .addIntegerOption(o => o.setName('count').setDescription('How many times to send').setRequired(true))
    .addStringOption(o => o.setName('embed').setDescription('The embed content').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('Direct image or GIF URL (must end in .gif/.png/.jpg)').setRequired(false))
    .addIntegerOption(o => o.setName('delay').setDescription('Delay in seconds between messages').setRequired(false))
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in the current channel')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete').setRequired(true))
    .addStringOption(o =>
      o.setName('target').setDescription('Delete everyone\'s messages or just yours').setRequired(true)
        .addChoices(
          { name: 'Mine only', value: 'mine' },
          { name: 'Everyone (requires Manage Messages)', value: 'everyone' }
        ))
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),

  new SlashCommandBuilder()
    .setName('nitro')
    .setDescription('Send a fake Discord Nitro gift')
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),



  new SlashCommandBuilder()
    .setName('osint')
    .setDescription('OSINT investigation tools')
    .addSubcommand(sub =>
      sub.setName('ip').setDescription('Lookup info on an IP address')
        .addStringOption(o => o.setName('ip').setDescription('IP address to lookup').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('username').setDescription('Search a username across 18 platforms')
        .addStringOption(o => o.setName('username').setDescription('Username to search').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('email').setDescription('Investigate an email address')
        .addStringOption(o => o.setName('email').setDescription('Email to investigate').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('phone').setDescription('Lookup a phone number (requires ABSTRACT_API_KEY)')
        .addStringOption(o => o.setName('phone').setDescription('Phone number with country code e.g. +14155552671').setRequired(true)))
    .setIntegrationTypes([0, 1]).setContexts([0, 1, 2]),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Starting command registration...');
    console.log('');
    const result = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Successfully registered ' + result.length + ' commands:');
    console.log('');
    result.forEach(cmd => { console.log('  /' + cmd.name + ' registered'); });
    console.log('');
    console.log('All done!');
  } catch (error) {
    console.error(error);
  }
})();
