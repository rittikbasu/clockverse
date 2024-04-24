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

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env["OPENROUTER_API_KEY"],
});

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

async function fetchPoem(poet) {
  const openaiResponse = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a poet who writes a beautiful poem in the style of ${poet}, that is precisely 4 lines long. Your poem can be inspired by something profound, fun, or anything else that moves you. The poem should stand alone, encapsulating its essence in just these four lines, no more, no less. Please generate the poem as a standalone piece of text, with no additional notes, explanations, symbols, or system messages included. Your focus should be on delivering this poem in its purest form, allowing the words alone to convey its depth and resonance.`,
      },
      {
        role: "user",
        content: `Write a poem that is ONLY 4 LINES LONG.`,
      },
    ],
    model: "mistralai/mistral-7b-instruct:free",
  });

  let poem = openaiResponse.choices[0].message.content;
  poem = poem.split("\n").slice(0, 4).join("\n");
  return poem;
}

async function fetchImage() {
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
  return {
    imageUrl: data.urls.full,
    blurhash: data.blur_hash,
    imageAlt: data.alt_description,
  };
}

async function acquireLock(lockKey) {
  const lock = await redis.setnx(lockKey, "locked", { ex: 10 });
  return lock === 1;
}

async function releaseLock(lockKey) {
  await redis.del(lockKey);
}

async function waitForDataOrLock(redisPoemKey, redisImageKey, lockKey) {
  let attempt = 0;
  while (attempt < 20) {
    const cachedPoem = await redis.get(redisPoemKey);
    const cachedImage = await redis.get(redisImageKey);
    if (cachedPoem && cachedImage) {
      return {
        cachedPoem: cachedPoem,
        cachedImage: cachedImage,
        lockAcquired: false,
      };
    }
    if (await acquireLock(lockKey)) {
      return {
        cachedPoem: cachedPoem ? cachedPoem : null,
        cachedImage: cachedImage ? cachedImage : null,
        lockAcquired: true,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    attempt++;
  }
}

export default async function handler(req, res) {
  const currentMinute = new Date().getMinutes();
  const redisPoemKey = `poem_${currentMinute}`;
  const redisImageKey = `image_${currentMinute}`;
  const lockKey = `lock_${currentMinute}`;

  try {
    const { cachedPoem, cachedImage, lockAcquired } = await waitForDataOrLock(
      redisPoemKey,
      redisImageKey,
      lockKey
    );

    let poem, poet, imageUrl, blurhash, imageAlt;

    if (cachedPoem) {
      ({ poem, poet } = cachedPoem);
    }

    if (cachedImage) {
      ({ imageUrl, blurhash, imageAlt } = cachedImage);
    }

    if (lockAcquired) {
      if (!cachedPoem) {
        poet = poets[Math.floor(Math.random() * poets.length)];
        poem = await fetchPoem(poet);
        await redis.set(redisPoemKey, JSON.stringify({ poem, poet }), {
          ex: 86400,
        });
      }

      if (!cachedImage) {
        ({ imageUrl, blurhash, imageAlt } = await fetchImage());
        await redis.set(
          redisImageKey,
          JSON.stringify({ imageUrl, blurhash, imageAlt }),
          { ex: 60 }
        );
      }
      await releaseLock(lockKey);
    }

    if (!poem || !imageUrl) {
      return res
        .status(503)
        .json({ error: "Failed to retrieve or generate necessary data." });
    }

    res.status(200).json({ poem, poet, imageUrl, blurhash, imageAlt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
