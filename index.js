const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
 intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.DirectMessages
 ]
});

const USER_ID = "YOUR_DISCORD_ID";

client.once('ready', () => {
 console.log('Companion Bot Online');

 setInterval(async () => {
   const user = await client.users.fetch(USER_ID);

   const msgs = [
    "Hey, just checking on you.",
    "You disappeared today.",
    "What are you doing right now?",
    "Hope your day is going okay.",
    "Talk to me if you're bored."
   ];

   const msg = msgs[Math.floor(Math.random()*msgs.length)];
   user.send(msg);

 }, 1000*60*60*3);
});

client.on('messageCreate', message => {
 if(message.author.bot) return;

 if(message.channel.type === 1){
   message.reply("I'm here with you.");
 }
});

client.login(process.env.TOKEN);
