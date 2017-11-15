const Discord = require("discord.js");
const client = new Discord.Client();
const config = require('config');
const token = config.get('discord-token');
const apikey = config.get('destiny-api-key');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
	console.log(msg.content.slice(0,18))
  if (msg.content === 'ping') {
    msg.reply('Pong!');
  }
  if (msg.content.slice(0,17).toLowerCase() === '.getdestinystats ') {
    msg.channel.send('Querying: ' + msg.content.slice(17));
  }

});

client.login(token);