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
already exist. You can start from the template:

```bash
cp .env.example .env.local
```

Set your OpenRouter key in `.env.local`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

`.env.local` is ignored by Git. The Vite development server reads this value on
startup and passes it only to the server-side chat endpoint; it is not exposed
to the browser. Restart `npm run dev` after adding or changing the key.

For Vercel, open your project’s **Settings → Environment Variables**, add `OPENROUTER_API_KEY` with your own OpenRouter key, select the environments you deploy to, and redeploy. Do not commit your key or put it in frontend code. If chat still fails, inspect the failed `/api/chat` invocation in the Vercel function logs. The app uses the `google/gemini-2.5-flash` model through OpenRouter.

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
