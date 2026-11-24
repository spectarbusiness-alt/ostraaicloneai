export const PROVIDER_IDS = [
	'gemini',
	'groq',
	'cerebras',
	'mistral',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];
export const LEGACY_PROVIDER_IDS = [
	'openai',
	'deepseek',
	'perplexity',
] as const;
export type LegacyProviderId = (typeof LEGACY_PROVIDER_IDS)[number];

export type ProviderResponse = {
	content: string;
	status: 'loading' | 'success' | 'error' | 'disabled';
	error?: string;
};

export type ChatTurn = {
	id: string;
	prompt: string;
	images: string[];
	responses: Record<ProviderId, ProviderResponse>;
	legacyResponses?: Partial<Record<LegacyProviderId, ProviderResponse>>;
};

export type Conversation = {
	id: string;
	title: string;
	updatedAt: number;
	turns: ChatTurn[];
};

export type ProviderMessagePart =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: { url: string } };

export type ProviderMessage = {
	role: 'user' | 'assistant';
	content: string | ProviderMessagePart[];
};
