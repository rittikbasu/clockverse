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
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env["GROQ_API_KEY"],
});

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export const config = {
  maxDuration: 20,
};

async function fetchPoem(poet) {
  try {
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
      model: "gemma2-9b-it",
      top_p: 0.9,
    });
    let poem = openaiResponse.choices[0].message.content
      .split("\n")
      .slice(0, 4)
      .join("\n");
    return poem;
  } catch (error) {
    console.error("Error fetching poem:", error);
    return null;
  }
}

async function fetchImage() {
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
      console.log("Unsplash API rate limit exceeded or other error");
      return { imageUrl: null, blurhash: null, imageAlt: null };
    }

    const data = await unsplashResponse.json();
    return {
      imageUrl: data.urls.regular,
      blurhash: data.blur_hash,
      imageAlt: data.alt_description,
    };
  } catch (error) {
    console.error("Error fetching image:", error);
    return { imageUrl: null, blurhash: null, imageAlt: null };
  }
}

async function waitForDataOrLock(redisKey, lockKey, currentTime) {
  let attempt = 0;
  const maxAttempts = 3;
  const retryDelay = 5000; // 5 seconds

  while (attempt < maxAttempts) {
    const cachedData = await redis.hgetall(redisKey);
    if (cachedData && cachedData.poem) {
      return { cachedData, lockAcquired: false };
    }

    const lock = await redis.set(lockKey, currentTime, { nx: true, ex: 10 });
    if (lock === "OK") {
      return { cachedData: null, lockAcquired: true };
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    attempt++;
  }

  throw new Error(
    "Failed to acquire lock or retrieve data after maximum attempts"
  );
}

function getUTCTime() {
  const now = new Date();
  return `${now.getUTCHours()};${String(now.getUTCMinutes()).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  const currentTime = getUTCTime();
  const currentMinute = new Date().getUTCMinutes();
  const redisKey = `data_${currentMinute}`;
  const lockKey = `lock_${currentMinute}`;

  try {
    const { cachedData, lockAcquired } = await waitForDataOrLock(
      redisKey,
      lockKey,
      currentTime
    );

    if (cachedData && !lockAcquired) {
      return res.status(200).json(cachedData);
    }

    if (lockAcquired) {
      // Generate new data
      const poet = poets[Math.floor(Math.random() * poets.length)];
      const poem = await fetchPoem(poet);
      const { imageUrl, blurhash, imageAlt } = await fetchImage();

      if (poem) {
        const newData = { poem, poet, imageUrl, blurhash, imageAlt };

        // Store new data in Redis
        await redis.hset(redisKey, newData);
        await redis.expire(redisKey, 60);
        await redis.del(lockKey);

        return res.status(200).json(newData);
      } else {
        await redis.del(lockKey);
        throw new Error("Failed to generate poem");
      }
    }

    // If we reach here, something unexpected happened
    throw new Error("Unexpected state: neither cached data nor lock acquired");
  } catch (error) {
    console.log("Error:", error);
    if (error.message.includes("max daily request limit exceeded")) {
      console.error("Upstash Daily Limit Reached:", error.message);
      res.status(429).json({
        error: "Service temporarily unavailable due to request limit.",
      });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
}
