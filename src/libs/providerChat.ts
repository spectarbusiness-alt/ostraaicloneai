import type { ProviderId, ProviderMessage } from './providers';

type ProviderStreamEvent = {
	text?: string;
	error?: string;
};

export async function runProviderChat(
	provider: ProviderId,
	messages: ProviderMessage[],
	onChunk: (chunk: string) => void,
): Promise<{ data?: string; error?: string }> {
	let output = '';
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

	try {
		const response = await fetch(`/api/chat/${provider}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages }),
		});
		if (!response.ok) {
			const body = await response.text();
			try {
				const parsed = JSON.parse(body) as { error?: { message?: string } };
				return {
					error:
						parsed.error?.message ??
						`${provider} request failed (HTTP ${response.status}).`,
				};
			} catch {
				return { error: `${provider} request failed (HTTP ${response.status}).` };
			}
		}
		if (!response.body) {
			throw new Error('The provider returned no response stream.');
		}

		reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let streamError: string | undefined;
		const processLine = (line: string) => {
			const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
			if (!normalized.startsWith('data:')) return;
			const data = normalized.slice(5).trim();
			if (!data || data === '[DONE]') return;

			const event = JSON.parse(data) as ProviderStreamEvent;
			if (event.error) {
				streamError = event.error;
				return;
			}
			if (event.text) {
				output += event.text;
				onChunk(event.text);
			}
		};

		let done = false;
		while (!done) {
			const result = await reader.read();
			done = result.done;
			buffer += decoder.decode(result.value, { stream: !done });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			lines.forEach(processLine);
			if (done && buffer) processLine(buffer);
		}

		return streamError
			? { ...(output ? { data: output } : {}), error: streamError }
			: output
				? { data: output }
				: { error: 'The provider returned an empty response.' };
	} catch (error) {
		return {
			...(output ? { data: output } : {}),
			error: error instanceof Error ? error.message : 'The provider request failed.',
		};
	} finally {
		reader?.releaseLock();
	}
}
