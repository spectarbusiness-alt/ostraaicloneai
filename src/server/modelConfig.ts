import type { ProviderId } from '../libs/providers';

export const PROVIDER_MODELS: Record<ProviderId, string> = {
	gemini: 'openai/gpt-oss-20b',
	groq: 'openai/gpt-oss-20b',
	cerebras: 'openai/gpt-oss-20b',
	mistral: 'openai/gpt-oss-20b',
};
