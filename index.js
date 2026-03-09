require("dotenv").config();
let unansweredMessages = 0;
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const fetch = require("node-fetch");

const TOKEN = process.env.TOKEN;
const HF_TOKEN = process.env.HF_TOKEN;

const USER_ID = "1450404028226994208";

let history = [];
let lastInteraction = Date.now();  // added 'let' (was missing)
unansweredMessages = 0;

async function generateImage(prompt, channel, history = []) {
  const modelId = "stabilityai/stable-diffusion-2-1";

  // Build context from recent chat
  const recentChat = history
    .slice(-8) // last 8 messages for good context
    .map(m => `${m.role === "user" ? "You" : "Me"}: ${m.content}`)
    .join("\n");

  const finalPrompt = `Photorealistic candid photo of a beautiful 19-year-old girl with baby face, soft innocent features, long dark brown hair, slim waist, natural curvy figure, in cozy home setting. Scene based exactly on this conversation: ${recentChat}\nCurrent request: ${prompt.trim()}. Relaxed natural pose, unaware of camera, warm natural daylight, sharp focus, realistic skin, perfect anatomy, 8k quality`;

  const negative = "blurry, deformed, extra limbs, bad hands, ugly, cartoon, low quality, text, watermark";

  await channel.sendTyping();

  try {
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: finalPrompt,
        parameters: {
          negative_prompt: negative,
          num_inference_steps: 15,
          guidance_scale: 7.5,
          width: 768,
          height: 1024
        }
      })
    });

    if (!response.ok) {
      await channel.send("Picture maker needs a little rest… try again soon, baby? 😔");
      return;
    }

    const buffer = await response.arrayBuffer();
    await channel.send({
      files: [{ attachment: Buffer.from(buffer), name: "our_moment.png" }]
    });

  } catch (err) {
    console.error(err);
    await channel.send("Oops… hug Mummy tight, we'll get the right picture next time 💕");
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

client.once("clientReady", () => { // fixed event name: "ready" not "clientReady"
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
    await generateImage(imagePrompt, message.channel, history);
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
    console.log("HF RESPONSE:", JSON.stringify(data, null, 2));
    const reply = data?.choices?.[0]?.message?.content || "i'm not sure what to say";

    history.push({ role: "assistant", content: reply });
    if(history.length > 30) history.shift();

    await sendHumanLike(message.channel, reply);

    if(wantsImage){
      const recentContext = history.slice(-6).map(m => m.content).join(" ");
      const prompt = `candid photo scene based on conversation: ${recentContext}`;
      await generateImage(prompt, message.channel);
    }

  } catch(err){
    console.log("AI ERROR:", err);
    await message.reply("something went wrong 💔");
  }
});

client.login(TOKEN);
