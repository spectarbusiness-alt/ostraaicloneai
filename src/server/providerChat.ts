import Groq from 'groq-sdk';

import type { ProviderId, ProviderMessage, ProviderMessagePart } from '../libs/providers';
import { PROVIDER_MODELS } from './modelConfig';

const MAX_MESSAGES = 100;
const MAX_TEXT_LENGTH = 100_000;
const MAX_IMAGES = 4;
const MAX_IMAGE_DATA_LENGTH = 4_000_000;
const REQUEST_TIMEOUT_MS = 60_000;
const PROVIDER_KEY_NAMES: Record<ProviderId, string> = {
	gemini: 'GROQ_API_KEY',
	groq: 'GROQ_API_KEY_2',
	cerebras: 'GROQ_API_KEY_3',
	mistral: 'GROQ_API_KEY_4',
};
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const jsonResponse = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const isProviderId = (value: string): value is ProviderId =>
	value === 'gemini' || value === 'groq' || value === 'cerebras' || value === 'mistral';

const validateMessages = (
	value: unknown,
): { messages: ProviderMessage[] } | { error: string } => {
	if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
		return { error: `Messages must contain between 1 and ${MAX_MESSAGES} entries.` };
	}

	const messages: ProviderMessage[] = [];
	let imageCount = 0;
	let imageDataLength = 0;

	for (const item of value) {
		if (
			!item ||
			typeof item !== 'object' ||
			!('role' in item) ||
			(item.role !== 'user' && item.role !== 'assistant') ||
			!('content' in item)
		) {
			return { error: 'Each message must have a user or assistant role and content.' };
		}

		if (typeof item.content === 'string') {
			if (item.content.length > MAX_TEXT_LENGTH) {
				return { error: 'A message is too long. Shorten it and try again.' };
			}
			messages.push({ role: item.role, content: item.content });
			continue;
		}
		if (item.role !== 'user' || !Array.isArray(item.content)) {
			return { error: 'Only user messages can contain image content.' };
		}

		const content: ProviderMessagePart[] = [];
		for (const part of item.content) {
			if (
				part &&
				typeof part === 'object' &&
				'type' in part &&
				part.type === 'text' &&
				'text' in part &&
				typeof part.text === 'string'
			) {
				if (part.text.length > MAX_TEXT_LENGTH) {
					return { error: 'A message is too long. Shorten it and try again.' };
				}
				content.push({ type: 'text', text: part.text });
				continue;
			}
			if (
				!part ||
				typeof part !== 'object' ||
				!('type' in part) ||
				part.type !== 'image_url' ||
				!('image_url' in part) ||
				!part.image_url ||
				typeof part.image_url !== 'object' ||
				!('url' in part.image_url) ||
				typeof part.image_url.url !== 'string'
			) {
				return { error: 'Message content must be text or supported image data.' };
			}

			const imageUrl = part.image_url.url;
			const match =
				/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
					imageUrl,
				);
			if (!match || !ALLOWED_IMAGE_TYPES.has(match[1])) {
				return { error: 'Use JPEG, PNG, or WebP images only.' };
			}
			imageCount += 1;
			imageDataLength += imageUrl.length;
			if (imageCount > MAX_IMAGES) {
				return { error: `A request can include up to ${MAX_IMAGES} images.` };
			}
			if (imageDataLength > MAX_IMAGE_DATA_LENGTH) {
				return { error: 'Attached images are too large. Choose smaller images.' };
			}
			content.push({ type: 'image_url', image_url: { url: imageUrl } });
		}
		messages.push({ role: item.role, content });
	}

	return { messages };
};

const toOpenAIMessages = (messages: ProviderMessage[]) =>
	messages.map((message) => {
		if (message.role === 'assistant' || typeof message.content === 'string') {
			return { role: message.role, content: message.content as string };
		}
		return {
			role: 'user' as const,
			content: message.content.map((part) =>
				part.type === 'text'
					? { type: 'text' as const, text: part.text }
					: { type: 'image_url' as const, image_url: { url: part.image_url.url } },
			),
		};
	});

const getErrorStatus = (error: unknown): number | undefined => {
	if (!error || typeof error !== 'object') return undefined;
	if ('status' in error && typeof error.status === 'number') return error.status;
	if ('statusCode' in error && typeof error.statusCode === 'number') {
		return error.statusCode;
	}
	return undefined;
};

const getErrorMessage = (error: unknown, apiKey: string): string => {
	const status = getErrorStatus(error);
	if (status === 401 || status === 403) return 'The API key was rejected. Check the Groq key in the server environment.';
	if (status === 404) return 'The configured model was not found or is unavailable to this account.';
	if (status === 408 || status === 504) return 'The provider took too long to respond. Please try again.';
	if (status === 429) return 'The provider rate limit was reached. Please wait a moment and retry.';
	if (status !== undefined && status >= 500) return 'The provider is temporarily unavailable. Please try again.';
	const message =
		error instanceof Error ? error.message : 'The provider request failed.';
	const sanitized = apiKey ? message.split(apiKey).join('[redacted]') : message;
	return sanitized.slice(0, 500) || 'The provider request failed.';
};

const getChunkText = (content: unknown): string => {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return '';
	return content
		.map((part) =>
			part && typeof part === 'object' && 'text' in part && typeof part.text === 'string'
				? part.text
				: '',
		)
		.join('');
};

const streamProvider = async (
	provider: ProviderId,
	messages: ProviderMessage[],
	apiKey: string,
	signal: AbortSignal,
	onText: (text: string) => void,
): Promise<void> => {
	const client = new Groq({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });
	const stream = await client.chat.completions.create(
		{
			model: PROVIDER_MODELS[provider],
			messages: toOpenAIMessages(messages),
			max_completion_tokens: 2048,
			stream: true,
		},
		{ signal },
	);
	for await (const chunk of stream) {
		const choice = 'choices' in chunk ? chunk.choices?.[0] : undefined;
		const text = choice && 'delta' in choice ? choice.delta?.content : undefined;
		if (text) onText(getChunkText(text));
	}
};

export async function handleProviderChatRequest(
	request: Request,
	providerName: string,
	apiKeys: Partial<Record<ProviderId, string>>,
): Promise<Response> {
	if (request.method !== 'POST') {
		return jsonResponse({ error: { message: 'Method not allowed.' } }, 405);
	}
	if (!isProviderId(providerName)) {
		return jsonResponse({ error: { message: 'Unknown AI provider.' } }, 404);
	}
	const provider = providerName;
	const apiKey = apiKeys[provider]?.trim();
	if (!apiKey || /^your_[a-z0-9_]+_api_key$/i.test(apiKey)) {
		return jsonResponse(
			{
				error: {
					message: `Set ${PROVIDER_KEY_NAMES[provider]} in the server environment or .env.local.`,
				},
			},
			503,
		);
	}

	let body: { messages?: unknown };
	try {
		body = (await request.json()) as { messages?: unknown };
	} catch {
		return jsonResponse({ error: { message: 'Request body must be valid JSON.' } }, 400);
	}
	const validated = validateMessages(body.messages);
	if ('error' in validated) {
		return jsonResponse({ error: { message: validated.error } }, 400);
	}

	const abortController = new AbortController();
	let timeout: ReturnType<typeof setTimeout>;
	let output = '';
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let closed = false;
			const send = (payload: { text?: string; error?: string }) => {
				if (!closed) {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
				}
			};
			timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
			void streamProvider(provider, validated.messages, apiKey, abortController.signal, (text) => {
				output += text;
				send({ text });
			})
				.then(() => {
					if (!output) send({ error: 'The provider returned an empty response.' });
				})
				.catch((error: unknown) => {
					send({
						error: abortController.signal.aborted
							? 'The provider took too long to respond. Please try again.'
							: getErrorMessage(error, apiKey),
					});
				})
				.finally(() => {
					clearTimeout(timeout);
					if (closed) return;
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
					closed = true;
				});
		},
		cancel() {
			clearTimeout(timeout);
			abortController.abort();
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no',
		},
	});
}
