import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env["OPENROUTER_API_KEY"],
});

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

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

const defaultPoem =
  "In the still of night,\nBeneath the moon's soft light,\nYour love is like a blood moon\nEternal and bright.";

const poet = poets[Math.floor(Math.random() * poets.length)];

async function generatePoem() {
  let aiResponse;
  const prompt = [
    {
      role: "system",
      content: `You are a poet who writes a beautiful poem in English in the style of ${poet}, that is precisely 4 lines long, without starting or ending with quotation marks or apostrophes, and without extra new lines. Your poem should be inspired by something profound, fun, or anything else that moves you. It should stand alone, encapsulating its essence in just these four lines, no more, no less. Generate the poem as a standalone piece of text, with no additional notes, explanations, symbols, or system messages. Focus on delivering this poem in its purest form, allowing the words alone to convey its depth and resonance.
    `,
    },
    {
      role: "user",
      content: `Write a poem that is ONLY 4 LINES LONG.`,
    },
  ];
  try {
    aiResponse = await openRouter.chat.completions.create({
      messages: prompt,
      model: "mistralai/mistral-7b-instruct:free",
    });
    await redis.incr("mistral-7b");
  } catch (error) {
    console.log(error.message);
    aiResponse = await openAI.chat.completions.create({
      messages: prompt,
      model: "gpt-3.5-turbo",
    });
    await redis.incr("gpt-3.5-turbo");
  } finally {
    const poem = aiResponse?.choices[0]?.message?.content || defaultPoem;
    return poem.split("\n").slice(0, 4).join("\n");
  }
}

async function fetchImage() {
  try {
    const response = await fetch(
      "https://api.unsplash.com/photos/random?orientation=portrait&topics=M8jVbLbTRws",
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );
    if (!response.ok) throw new Error("Rate Limit Exceeded");
    const data = await response.json();
    return {
      imageUrl: data.urls.full,
      blurhash: data.blur_hash,
      imageAlt: data.alt_description,
    };
  } catch (error) {
    console.log(error.message);
    return {};
  }
}

async function checkOrSetCache(redisKey, callback) {
  let cachedData = await redis.hgetall(redisKey);
  if (cachedData) return cachedData;

  const lockAcquired = await redis.set(redisKey + "_lock", "1", {
    ex: 10,
    nx: true,
  });
  if (!lockAcquired) {
    let delay = 2000;
    while (delay >= 500) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      cachedData = await redis.hgetall(redisKey);
      if (cachedData) return cachedData;
      delay -= 500;
    }
    return callback();
  }

  const data = await callback();
  // console.log(data);
  // remove undefined or null values from the object
  Object.keys(data).forEach((key) => data[key] == null && delete data[key]);
  await redis.hset(redisKey, data);

  await redis.expire(redisKey, 60);
  await redis.del(redisKey + "_lock");
  return data;
}

export default async function handler(req, res) {
  const currentTime = new Date();
  const timeKey = currentTime.toISOString().substring(11, 16);
  const redisKey = timeKey + "_data";

  const cachedData = await checkOrSetCache(redisKey, async () => {
    const { imageUrl, blurhash, imageAlt } = await fetchImage();
    const poem = await generatePoem();
    return { poem, poet, imageUrl, blurhash, imageAlt };
  });

  res.status(200).json(cachedData);
}
