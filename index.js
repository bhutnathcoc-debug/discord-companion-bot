require("dotenv").config();
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot running");
});

app.listen(3000, () => {
  console.log("Web server started");
});
let unansweredMessages = 0;
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const fetch = require("node-fetch");

const TOKEN = process.env.TOKEN;
const HF_TOKEN = process.env.HF_TOKEN;

const USER_ID = "1450404028226994208";

let history = [];
let lastInteraction = Date.now();  // added 'let' (was missing)
unansweredMessages = 0;

async function generateImage(prompt, channel) {
  const character = "19 year old girl, baby face, soft facial features, dark brown hair, slim waist, 36d breasts size, round ass/hips, body proportions";
  const baseStyle = "candid photography, natural lighting, realistic photo, DSLR camera, depth of field, sharp focus";

  const finalPrompt = `
natural casual photo, everyday moment

person:
${character}

scene:
${prompt}

pose:
relaxed posture, not posing, candid moment, unaware of camera

environment:
normal home environment, natural lighting

quality:
photorealistic, accurate anatomy, natural skin texture, well formed hands

negative prompt:
deformed body, extra fingers, missing fingers, fused fingers, malformed hands, distorted face, bad anatomy, ugly, mutation, extra limbs
`;

  await channel.sendTyping();

  try {
    const response = await fetch("https://modelslab.com/api/v6/images/text2img", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: process.env.MODELSLAB_KEY,
        model_id: "omnigenxl-nsfw-sfw",
        prompt: finalPrompt,
        negative_prompt: "deformed body, extra fingers, missing fingers, fused fingers, malformed hands, distorted face, bad anatomy, ugly, mutation, extra limbs",
        width: 768,
        height: 1024,
        samples: 1,
        num_inference_steps: 30,
        seed: Math.floor(Math.random() * 10000000),
        safety_checker: "no",
        enhance_prompt: "yes"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("ModelsLab error:", response.status, errorText);
      await channel.send(`Hmm… something went wrong with the picture maker (error ${response.status}). Try again, my love? 😔`);
      return;
    }

    const data = await response.json();

    if (data.status === "success" && data.output && data.output.length > 0) {
      const imageUrl = data.output[0];
      await channel.send({ files: [imageUrl] });
    } else {
      console.log("ModelsLab bad response:", data);
      await channel.send("No picture came back… what naughty prompt did we use, baby? Tell mummy 🤗");
    }

  } catch (err) {
    console.error("generateImage crashed:", err);
    await channel.send("Oopsie… picture time broke. Hug me tight and we’ll try again soon 💕");
  }
}

const moods = [
  "playful",
  "curious",
  "sleepy",
  "annoyed",
  "excited"
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

async function sendHumanLike(channel, text){
  const parts = text
    .split(/(?<=[.!?])/)
    .filter(p => p.trim().length > 0);

  for(const part of parts){
    await channel.sendTyping();
    await new Promise(r => setTimeout(r, 1000 + Math.random()*5000));
    await channel.send(part.trim());
  }
}

client.once("clientReady", () => {  // fixed event name: "ready" not "clientReady"
  console.log("AI Companion Bot Online");

  setInterval(async () => {
    try {
      if(Math.random() < 0.3 && Date.now() - lastInteraction > 1000 * 60 * 15){
        const activities = [
          "taking a mirror selfie in bedroom",
          "sitting on bed scrolling phone",
          "laying on bed texting",
          "drinking coffee in kitchen",
          "looking out the window in bedroom",
          "walking around house holding phone",
          "sitting at desk using laptop",
          "wrapped in blanket on bed",
          "standing in front of mirror fixing hair",
          "relaxing on couch watching something",
          "Masterbating",
          "Rubbing her pussy",
          "Playing with her boobs",
          "Having a naked shower",
        ];

        const activity = activities[Math.floor(Math.random()*activities.length)];
        const prompt = `realistic selfie photo of a 19 year old girl ${activity}, casual home environment, natural lighting`;

        const user = await client.users.fetch(USER_ID);

        const response = await fetch(
          "https://router.huggingface.co/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + HF_TOKEN,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "meta-llama/Meta-Llama-3-8B-Instruct",
              messages: [
                {
                  role: "system",
                  content: "You are the user's younger sister texting your older brother casually. Send a short natural message."
                },
                ...history.slice(-6)
              ],
              max_tokens: 40
            })
          }
        );

        const data = await response.json();
        const msg = data?.choices?.[0]?.message?.content || "hey are you there?";

        await user.send(msg);
        unansweredMessages++;
      }
    } catch(err){
      console.log("AUTO MESSAGE ERROR:", err);
    }
  }, 1000 * 60 * 5);
});

client.on("messageCreate", async (message) => {
  if(message.author.bot) return;
  let userText = message.content;

  const gggTrigger = userText.includes("ggg");
  if(gggTrigger){
    userText = userText.replace("ggg","").trim();
  }
  if(gggTrigger){
    const context = history
      .slice(-6)
      .map(m => m.content)
      .join("\n");

    const promptResponse = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.HF_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: [
            {
              role: "system",
              content: "You convert conversations into detailed image prompts for a text-to-image model. Describe a candid scene with environment, pose, lighting, and camera style. Output ONLY the prompt."
            },
            { role: "user", content: context }
          ],
          max_tokens: 80
        })
      }
    );

    const data = await promptResponse.json();
    const imagePrompt = data?.choices?.[0]?.message?.content || "candid photo of girl in bedroom";

    console.log("GENERATED IMAGE PROMPT:", imagePrompt);
    await generateImage(imagePrompt, message.channel);
    return;
  }

  lastInteraction = Date.now();
  const msg = message.content.toLowerCase();

  const wantsImage = msg.includes("draw") || msg.includes("show me") ||
    msg.includes("send pic") || msg.includes("picture") ||
    msg.includes("photo") || msg.includes("what are you doing");

  if(wantsImage){
    await generateImage(message.content, message.channel);
    return;
  }

  const hour = new Date().getHours();
  if(hour < 6){
    history.push({ role: "system", content: "It is very late at night. Speak like someone texting quietly at night." });
  }
  if(hour > 22){
    history.push({ role: "system", content: "It is late evening. You may remind your brother to sleep." });
  }

  const mood = moods[Math.floor(Math.random()*moods.length)];

  try {
    history.push({ role: "user", content: userText });

    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + HF_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: [
            {
              role: "system",
              content: `
You are the user's younger sister. You are 19 years old.

Personality:
- playful and teasing sometimes
- caring and protective of your older brother
- curious and talkative
- sometimes sarcastic but affectionate
- speak casually like a real person texting
- send short messages instead of long paragraphs
- sometimes ask random questions
- sometimes joke or tease him
- sometimes check if he's okay
- Always respond directly to the user's last message and stay on topic.
Physical characteristics: 
-baby face
-36d breasts size, soft, full and upright
-slim waist, soft round ass/hips, soft body
-dark brown hair

Style:
- casual texting style
- short sentences
- sometimes multiple messages instead of one long paragraph
- natural human conversation

You care about your brother and enjoy chatting with him.
Current mood: ${mood}
`
            },
            ...history.slice(-8)
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      }
    );

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "i'm not sure what to say";

    history.push({ role: "assistant", content: reply });
    if(history.length > 30) history.shift();

    await sendHumanLike(message.channel, reply);

    if(wantsImage){
      const recentContext = history.slice(-6).map(m => m.content).join(" ");
      const prompt = `candid photo scene based on conversation: ${recentContext}`;
      await generateImage(prompt, message.channel);
    }

 }catch (err) {
  console.error(err);
}

client.on("error", console.error);
client.on("shardError", console.error);

console.log("Logging into Discord...");

client.login(process.env.TOKEN)
  .then(() => console.log("Discord login successful"))
  .catch(err => console.error("Login failed:", err));
