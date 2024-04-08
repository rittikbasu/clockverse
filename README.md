# clockverse

I built this project because I didn't have a clock in my room, but what I did have was a spare monitor. Thus, clockverse was born, a creative way to fill that empty screen and display an AI generated poem every minute in the style of renowned poets, paired with beautiful backgrounds.

![frize](<https://ik.imagekit.io/zwcfsadeijm/clockverse_ss_W_7MYspuL.png?updatedAt=1712597082755>)

## Tech Stack

- Next.js
- Tailwind CSS
- Redis
- Mistral 7b
- Vercel

## Getting Started

To get clockverse up and running on your spare monitor, follow these simple steps:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Fire up the development server and open http://localhost:3000 to see your monitor come alive with poetry.

## Customization

You can customize the prompt in `pages/api/fetchData.js` or add more poets to the list and also change the model used to generate the poems.

## Contributing

Clockverse is an open-source project, and contributions are welcome. Whether you're a poet or a developer or both, feel free to submit a pull request.
