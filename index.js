const { Client, GatewayIntentBits, ModalBuilder, TextInputComponent, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

// Initialize client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.Messages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
});

// Custom app settings
const appName = "YourApp"; // Replace with your chosen name
const appPfp = "https://yourapp.com/pfp.png"; // Replace with your chosen profile picture URL

// Store spam data in memory (for simplicity)
const spamData = {
  currentSpam: null,
  spamCount: 0,
  delay: 0
};

// Command handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  // Handle /ban command
  if (interaction.commandName === 'ban') {
    const modal = new ModalBuilder()
      .setCustomId('banModal')
      .setTitle('Fake Ban Confirmation')
      .addComponents(
        new TextInputComponent()
          .setLabel('User to ban')
          .setPlaceholder('Enter username')
          .setStyle(1)
      );

    const modalMessage = await interaction.reply({
      content: 'Please confirm the ban',
      components: [modal.createActionRow()],
      ephemeral: true
    });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.customId === 'banModal') {
        const userToBan = componentInteraction.fields.getTextInputValue();
        await componentInteraction.reply(`Banning ${userToBan}...`);
        // Simulate ban process (no actual ban)
        setTimeout(() => {
          componentInteraction.channel.send(`User ${userToBan} has been banned.`);
        }, 1000);
      }
    });
  }

  // Handle /spamraid command
  if (interaction.commandName === 'spamraid') {
    const message = interaction.options.getString('message');
    const count = interaction.options.getInteger('count');
    const delay = interaction.options.getInteger('delay') || 0;

    spamData.currentSpam = { message, count, delay };
    spamData.spamCount = 0;

    const buttons = [
      new ButtonBuilder()
        .setCustomId('spamStart')
        .setLabel('Start Spam')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('spamCancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.reply({ content: 'Spam ready to start', components: [row], ephemeral: true });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.customId === 'spamStart') {
        for (let i = 0; i < count; i++) {
          await componentInteraction.channel.send(message);
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
          }
          spamData.spamCount++;
        }
        await componentInteraction.reply(`Spam completed: ${spamData.spamCount} messages sent.`);
      } else if (componentInteraction.customId === 'spamCancel') {
        await componentInteraction.reply('Spam cancelled.');
      }
    });
  }

  // Handle /embedspam command
  if (interaction.commandName === 'embedspam') {
    const message = interaction.options.getString('message');
    const embedContent = interaction.options.getString('embed');
    const count = interaction.options.getInteger('count');
    const delay = interaction.options.getInteger('delay') || 0;

    spamData.currentSpam = { message, embedContent, count, delay };
    spamData.spamCount = 0;

    const buttons = [
      new ButtonBuilder()
        .setCustomId('embedSpamStart')
        .setLabel('Start Spam')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('embedSpamCancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.reply({ content: 'Embed spam ready to start', components: [row], ephemeral: true });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.customId === 'embedSpamStart') {
        for (let i = 0; i < count; i++) {
          const embed = new EmbedBuilder()
            .setTitle('Spam Embed')
            .setDescription(embedContent)
            .setFooter({ text: `Spam ${i + 1}/${count}` });

          await componentInteraction.channel.send({ content: message, embeds: [embed] });
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
          }
          spamData.spamCount++;
        }
        await componentInteraction.reply(`Embed spam completed: ${spamData.spamCount} messages sent.`);
      } else if (componentInteraction.customId === 'embedSpamCancel') {
        await componentInteraction.reply('Embed spam cancelled.');
      }
    });
  }
});

// Login with your bot token
client.login('MTQ3NzQyMjM2MDM4OTc1MDc5NA.GHCAjY.LXFFba1QkFV98QEJq7DeRnlViQ4hRuSLAK57YcMTQ3NzQyMjM2MDM4OTc1MDc5NA.GHCAjY.LXFFba1QkFV98QEJq7DeRnlViQ4hRuSLAK57Yc');
