# Ostra

![Ostra logo](public/ostra-logo.png)

## Description

Ostra is an AI chat app built with React, Tailwind CSS, TypeScript, and Vite.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Starting the Development Server](#starting-the-development-server)
- [Contributing](#contributing)
- [Live Preview](#live-preview)

## Tech Stack

- React
- Tailwind CSS
- TypeScript
- Vite

## Installation

Make sure you have Node.js installed on your machine.

Clone the repository:

```bash
git clone https://github.com/spectarbusiness-alt/ostraaicloneai.git
```

Navigate to the project directory:

```bash
cd ostraaicloneai
```

Install dependencies:
Run one of the following commands based on your preferred package manager:

- Using npm:

```bash
npm install
```

- Using yarn:

```bash
yarn install
```

- Using pnpm:

```bash
pnpm install
```

## Environment Variables

For local development, create `.env.local` in the project root if it does not
already exist. Add the API keys for each provider:

```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
MISTRAL_API_KEY=your_mistral_api_key
```

`.env.local` is ignored by Git. The Vite development server reads these values
on startup and uses them only in server-side provider integrations; they are
never exposed to the browser. Do not overwrite an existing `.env.local` with
the template. Restart `npm run dev` after adding or changing a key. Model IDs
are configured centrally in `src/server/modelConfig.ts`. The current configured
models are Gemini 3.5 Flash-Lite, GPT-OSS 20B on Groq, Qwen 3.8 27B on Cerebras,
and Mistral Small via its `latest` alias.

For Vercel, add `GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, and
`MISTRAL_API_KEY` in **Settings → Environment Variables**, select the
environments to deploy to, and redeploy. Do not commit keys or put them in
frontend code. Each model column reports its own provider error independently.

## Starting the Development Server

To start the development server:
Run one of the following commands based on your preferred package manager:

- Using npm:

```bash
npm run dev
```

- Using yarn:

```bash
yarn dev
```

- Using pnpm:

```bash
pnpm dev
```

Open your browser and navigate to http://localhost:5173 to see the app live.

## Contributing

If you want to add additional features and improvements, we welcome contributions! Please follow these guidelines:

- Fork the repository
- Create a new branch
- Make your changes
- Submit a pull request

## Live Preview

Run `npm run dev` and open [http://localhost:5173](http://localhost:5173) to preview Ostra locally.

## Starter GitHub Repo for React

The starter GitHub repository used for this project [React Starter](https://github.com/nyintosh/react-starter).
