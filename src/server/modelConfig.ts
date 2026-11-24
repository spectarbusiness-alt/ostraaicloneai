import type { ProviderId } from '../libs/providers';

export const PROVIDER_MODELS: Record<ProviderId, string> = {
	gemini: 'gemini-3.5-flash-lite',
	groq: 'openai/gpt-oss-20b',
	cerebras: 'qwen-3.8-27b',
	mistral: 'mistral-small-latest',
};
