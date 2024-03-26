import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export default async function handler(req, res) {
  const { time } = req.query;
  let imageUrl;
  try {
    const response = await fetch(
      "https://api.unsplash.com/photos/random?orientation=portrait&topics=M8jVbLbTRws",
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Rate Limit Exceeded");
    }

    const data = await response.json();
    imageUrl = data.urls.full;
  } catch (error) {
    // console.error(error);
    imageUrl =
      "https://images.unsplash.com/photo-1710976151734-72b48a6d66f4?q=80&w=2548&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  }

  // // console.log(imageUrl);

  const poemResponse = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a poet that makes a beautiful and short poem, no more than 4 verses long in the style of Sylvia Plath with the current time by using the time in the first line of the poem, write the time in words in full and not as numerals. Note: use \n to separate the verses.",
      },
      {
        role: "user",
        content: `The time is ${time}`,
      },
    ],
    model: "gpt-3.5-turbo",
  });

  const poem = poemResponse.choices[0].message.content;

  res.status(200).json({ poem, imageUrl });
}
