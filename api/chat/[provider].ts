import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleProviderChatRequest } from '../../src/server/providerChat';
import { writeResponseStream } from '../../src/server/writeResponseStream';

type VercelRequest = IncomingMessage & { body?: unknown };

const readBody = async (request: VercelRequest): Promise<string | undefined> => {
	if (request.method === 'GET' || request.method === 'HEAD') return undefined;
	if (request.body !== undefined) {
		return typeof request.body === 'string'
			? request.body
			: JSON.stringify(request.body);
	}

	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString('utf8');
};

export default async function handler(
	request: VercelRequest,
	response: ServerResponse,
): Promise<void> {
	try {
		const method = request.method ?? 'POST';
		const body = await readBody(request);
		const headers = {
			'Content-Type': request.headers['content-type'] ?? 'application/json',
		};
		const apiRequest = new Request(
			new URL(request.url ?? '/api/chat', `https://${request.headers.host ?? 'localhost'}`),
			{ method, headers, ...(body === undefined ? {} : { body }) },
		);
		const pathParts = new URL(
			request.url ?? '/api/chat',
			'https://localhost',
		).pathname.split('/').filter(Boolean);
		const providerName = pathParts[pathParts.length - 1] ?? '';
		const apiKeys = {
			gemini: process.env.GROQ_API_KEY_5 || process.env.GROQ_API_KEY,
			groq: process.env.GROQ_API_KEY_5_2_2 || process.env.GROQ_API_KEY_2,
			cerebras: process.env.GROQ_API_KEY_5_3_2 || process.env.GROQ_API_KEY_3,
			mistral: process.env.GROQ_API_KEY_5_4_2 || process.env.GROQ_API_KEY_4,
		};
		const apiResponse = await handleProviderChatRequest(
			apiRequest,
			providerName,
			apiKeys,
		);

		response.statusCode = apiResponse.status;
		apiResponse.headers.forEach((value, name) =>
			response.setHeader(name, value),
		);
		await writeResponseStream(apiResponse.body, response);
	} catch (error) {
		console.error('Provider chat function failed.');
		if (response.headersSent) {
			response.destroy(error instanceof Error ? error : undefined);
			return;
		}
		response.statusCode = 500;
		response.setHeader('Content-Type', 'application/json');
		response.end(JSON.stringify({ error: { message: 'The chat service failed to start.' } }));
	}
}
