import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const poets = [
  "sylvia plath",
  "robert frost",
  "emily dickinson",
  "rabindranath tagore",
  "william wordsworth",
  "pablo neruda",
  "william shakespeare",
  "john keats",
  "alfred lord tennyson",
  "william blake",
  "edgar allan poe",
  "walt whitman",
  "langston hughes",
  "maya angelou",
  "robert burns",
  "william butler yeats",
  "dylan thomas",
  "william carlos williams",
  "ezra pound",
  "wallace stevens",
  "t.s. eliot",
  "e.e. cummings",
  "sara teasdale",
  "carl sandburg",
  "edna st. vincent millay",
  "lang leav",
  "rupi kaur",
  "atticus",
  "nayyirah waheed",
  "rumi",
];

const words = [
  "life",
  "time",
  "internet",
  "time travel",
  "moon",
  "space",
  "universe",
  "cosmos",
  "coding",
  "time machine",
  "infinity",
  "machine",
  "cipher",
  "future",
];

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env["OPENROUTER_API_KEY"],
});

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export default async function handler(req, res) {
  const { time, tz } = req.query;
  const redisPoemKey = time + "_" + tz;
  const redisImageKey = new Date()
    .toISOString()
    .replace(/:\d{2}\.\d{3}Z$/, "Z");
  let imageUrl;
  let blurhash;
  let imageAlt;

  // First, check if the poem data already exists in Redis
  let cachedData = await redis.get(redisPoemKey);
  if (cachedData) {
    const { poem, poet } = cachedData;
    const cachedImage = await redis.get(redisImageKey);
    if (cachedImage) {
      imageUrl = cachedImage.imageUrl;
      blurhash = cachedImage.blurhash;
      imageAlt = cachedImage.imageAlt;
    }
    return res.status(200).json({ poem, poet, imageUrl, blurhash, imageAlt });
  }

  // Attempt to acquire a lock
  const lock = await redis.set(redisPoemKey + "_lock", "1", {
    ex: 10,
    nx: true, // Only set the key if it does not already exist
  });

  if (lock) {
    // Lock acquired, this request will generate the poem and image
    try {
      const unsplashResponse = await fetch(
        "https://api.unsplash.com/photos/random?orientation=portrait&topics=M8jVbLbTRws",
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );
      if (!unsplashResponse.ok) {
        throw new Error("Rate Limit Exceeded");
      }

      const data = await unsplashResponse.json();
      imageUrl = data.urls.full;
      blurhash = data.blur_hash;
      imageAlt = data.alt_description;
    } catch (error) {
      // console.error(error);
      console.log("Rate Limit Exceeded");
    }

    const poet = poets[Math.floor(Math.random() * poets.length)];
    const word = words[Math.floor(Math.random() * words.length)];
    const openaiResponse = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a poet who writes a beautiful and short poem, exactly 4 lines long in the style of ${poet}. Your poem revolves around the word: "${word}". Let the word inspire you to create a poem that resonates deeply, capturing the essence of the word in your verse. Remember to keep your poem exactly 4 lines long.`,
        },
        // {
        //   role: "user",
        //   content: `Write a poem in the style of ${poet}. Your poem revolves around the word "${word}". Let the word inspire you to create a poem that resonates deeply, capturing the essence of the word in your verses. Remember to keep your poem exactly 4 lines.`,
        // },
      ],
      model: "mistralai/mistral-7b-instruct:free",
    });

    const poem = openaiResponse.choices[0].message.content;

    await redis.set(redisPoemKey, JSON.stringify({ poem, poet }), {
      ex: 60,
    });
    if (imageUrl) {
      await redis.set(
        redisImageKey,
        JSON.stringify({ imageUrl, blurhash, imageAlt }),
        {
          ex: 60,
        }
      );
    }
    await redis.del(redisPoemKey + "_lock");

    res.status(200).json({ poem, poet, imageUrl, blurhash, imageAlt });
  } else {
    // Lock not acquired, wait for the content to be generated
    let cachedData;
    while (!cachedData) {
      // Wait for a short period before checking again
      await new Promise((resolve) => setTimeout(resolve, 500));
      cachedData = await redis.get(redisPoemKey);
    }

    const { poem, poet } = cachedData;
    const cachedImage = await redis.get(redisImageKey);
    if (cachedImage) {
      imageUrl = cachedImage.imageUrl;
      blurhash = cachedImage.blurhash;
      imageAlt = cachedImage.imageAlt;
    }
    res.status(200).json({ poem, poet, imageUrl, blurhash, imageAlt });
  }
}
