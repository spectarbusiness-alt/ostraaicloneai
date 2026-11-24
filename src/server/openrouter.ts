import type { OpenRouterMessage } from '../libs/chatTypes';

const MODEL = 'google/gemini-2.5-flash';
const MAX_TOKENS = 1024;
const OPENROUTER_TIMEOUT_MS = 30_000;
const MAX_IMAGES = 4;
const MAX_IMAGE_DATA_LENGTH = 4_000_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_MESSAGES = 100;

type ChatRequestBody = {
	prompt?: unknown;
	images?: unknown;
	messages?: unknown;
};

type ValidatedMessages =
	| {
		messages: OpenRouterMessage[];
		imageCount: number;
		imageDataLength: number;
	}
	| { error: string };

const jsonResponse = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const validateMessages = (value: unknown): ValidatedMessages => {
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.length > MAX_MESSAGES
	) {
		return {
			error: `Messages must contain between 1 and ${MAX_MESSAGES} entries.`,
		};
	}

	const messages: OpenRouterMessage[] = [];
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
			return {
				error: 'Each message must have a user or assistant role and content.',
			};
		}

		if (typeof item.content === 'string') {
			messages.push({ role: item.role, content: item.content });
			continue;
		}

		if (item.role !== 'user' || !Array.isArray(item.content)) {
			return { error: 'Only user messages can contain image content.' };
		}

		const content: OpenRouterMessage['content'] = [];
		for (const part of item.content) {
			if (
				part &&
				typeof part === 'object' &&
				'type' in part &&
				part.type === 'text' &&
				'text' in part &&
				typeof part.text === 'string'
			) {
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
				return {
					error: 'Message content must be text or supported image data.',
				};
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
				return {
					error: `A conversation request can include up to ${MAX_IMAGES} images.`,
				};
			}
			if (imageDataLength > MAX_IMAGE_DATA_LENGTH) {
				return {
					error: 'Attached images are too large. Choose smaller images.',
				};
			}
			content.push({ type: 'image_url', image_url: { url: imageUrl } });
		}
		messages.push({ role: item.role, content });
	}

	return { messages, imageCount, imageDataLength };
};

export async function handleChatRequest(
	request: Request,
	apiKey?: string,
): Promise<Response> {
	if (request.method !== 'POST') {
		return jsonResponse({ error: { message: 'Method not allowed.' } }, 405);
	}

	if (!apiKey?.trim()) {
		return jsonResponse(
			{
				error: {
					message:
						'Set OPENROUTER_API_KEY in the server environment or .env.local.',
				},
			},
			500,
		);
	}

	let body: ChatRequestBody;
	try {
		body = (await request.json()) as { prompt?: unknown };
	} catch {
		return jsonResponse(
			{ error: { message: 'Request body must be valid JSON.' } },
			400,
		);
	}

	const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
	if (body.prompt !== undefined && typeof body.prompt !== 'string') {
		return jsonResponse(
			{ error: { message: 'Prompt must be a string.' } },
			400,
		);
	}

	let messages: OpenRouterMessage[];
	if (body.messages !== undefined) {
		const validated = validateMessages(body.messages);
		if ('error' in validated) {
			return jsonResponse({ error: { message: validated.error } }, 400);
		}
		messages = validated.messages;
	} else {
		if (body.images !== undefined && !Array.isArray(body.images)) {
			return jsonResponse(
				{ error: { message: 'Images must be an array.' } },
				400,
			);
		}

		const images = (body.images ?? []) as unknown[];
		if (images.length > MAX_IMAGES) {
			return jsonResponse(
				{
					error: {
						message: `You can attach up to ${MAX_IMAGES} images per message.`,
					},
				},
				400,
			);
		}

		let totalImageDataLength = 0;
		const imageParts: { type: 'image_url'; image_url: { url: string } }[] = [];
		for (const image of images) {
			if (typeof image !== 'string') {
				return jsonResponse(
					{ error: { message: 'Each image must be a data URL.' } },
					400,
				);
			}
			const match =
				/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
					image,
				);
			if (!match || !ALLOWED_IMAGE_TYPES.has(match[1])) {
				return jsonResponse(
					{ error: { message: 'Use JPEG, PNG, or WebP images only.' } },
					400,
				);
			}

			totalImageDataLength += image.length;
			if (totalImageDataLength > MAX_IMAGE_DATA_LENGTH) {
				return jsonResponse(
					{
						error: {
							message: 'Attached images are too large. Choose smaller images.',
						},
					},
					413,
				);
			}
			imageParts.push({ type: 'image_url', image_url: { url: image } });
		}

		if (!prompt && imageParts.length === 0) {
			return jsonResponse(
				{ error: { message: 'Enter a prompt or attach at least one image.' } },
				400,
			);
		}

		messages = [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: prompt || 'Describe and analyze the attached image.',
					},
					...imageParts,
				],
			},
		];
	}

	const abortController = new AbortController();
	const timeout = setTimeout(
		() => abortController.abort(),
		OPENROUTER_TIMEOUT_MS,
	);
	try {
		const upstream = await fetch(
			'https://openrouter.ai/api/v1/chat/completions',
			{
				signal: abortController.signal,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey.trim()}`,
				},
				body: JSON.stringify({
					model: MODEL,
					messages,
					temperature: 0.9,
					max_tokens: MAX_TOKENS,
					stream: true,
				}),
			},
		);
		const headers = {
			'Content-Type':
				upstream.headers.get('Content-Type') ?? 'application/json',
		};
		if (!upstream.ok) {
			const responseBody = await upstream.text();
			clearTimeout(timeout);
			return new Response(responseBody, { status: upstream.status, headers });
		}
		if (!upstream.body) {
			clearTimeout(timeout);
			return jsonResponse(
				{ error: { message: 'OpenRouter returned an empty response.' } },
				502,
			);
		}

		const reader = upstream.body.getReader();
		const encoder = new TextEncoder();
		const body = new ReadableStream<Uint8Array>({
			async pull(streamController) {
				try {
					const { done, value } = await reader.read();
					if (done) {
						clearTimeout(timeout);
						reader.releaseLock();
						streamController.close();
					} else {
						streamController.enqueue(value);
					}
				} catch (error) {
					clearTimeout(timeout);
					reader.releaseLock();
					if (abortController.signal.aborted) {
						streamController.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({ error: { message: 'OpenRouter took too long to respond. Please try again.' } })}\n\n`,
							),
						);
						streamController.close();
					} else {
						streamController.error(error);
					}
				}
			},
			async cancel(reason) {
				clearTimeout(timeout);
				try {
					await reader.cancel(reason);
				} finally {
					reader.releaseLock();
				}
			},
		});

		return new Response(body, {
			status: upstream.status,
			headers,
		});
	} catch {
		clearTimeout(timeout);
		if (abortController.signal.aborted) {
			return jsonResponse(
				{ error: { message: 'OpenRouter took too long to respond. Please try again.' } },
				504,
			);
		}

		return jsonResponse(
			{ error: { message: 'Unable to reach OpenRouter.' } },
			502,
		);
	}
}
