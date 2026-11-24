import type { OpenRouterMessage } from './chatTypes';

type OpenRouterResponse = {
	error?: { message?: string };
};

type OpenRouterStreamChunk = {
	choices?: { delta?: { content?: string | null } }[];
	error?: { message?: string };
};

export async function runChat(
	messages: OpenRouterMessage[],
	onChunk: (chunk: string) => void,
): Promise<{ data?: string; error?: string }> {
	let output = '';
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	try {
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages }),
		});
		if (!res.ok) {
			const body = await res.text();
			try {
				const json = JSON.parse(body) as OpenRouterResponse;
				return { error: json.error?.message ?? 'Chat request failed.' };
			} catch {
				return { error: `The chat service failed (HTTP ${res.status}).` };
			}
		}

		if (!res.body) throw new Error('The chat service returned no response stream.');
		reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		const processLine = (line: string) => {
			const dataLine = line.endsWith('\r') ? line.slice(0, -1) : line;
			if (!dataLine.startsWith('data:')) return;

			const data = dataLine.slice(5).trimStart();
			if (!data || data === '[DONE]') return;

			const chunk = JSON.parse(data) as OpenRouterStreamChunk;
			if (chunk.error?.message) throw new Error(chunk.error.message);

			const text = chunk.choices?.[0]?.delta?.content;
			if (typeof text === 'string' && text) {
				output += text;
				onChunk(text);
			}
		};

		let streamDone = false;
		while (!streamDone) {
			const result = await reader.read();
			streamDone = result.done;
			buffer += decoder.decode(result.value, { stream: !streamDone });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			lines.forEach(processLine);
			if (streamDone) {
				processLine(buffer);
			}
		}

		return output
			? { data: output }
			: { error: 'OpenRouter returned an empty response.' };
	} catch (error) {
		return {
			...(output ? { data: output } : {}),
			error: error instanceof Error ? error.message : 'Chat request failed.',
		};
	} finally {
		reader?.releaseLock();
	}
}
