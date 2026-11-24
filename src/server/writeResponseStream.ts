import type { ServerResponse } from 'node:http';

export async function writeResponseStream(
	body: ReadableStream<Uint8Array> | null,
	response: ServerResponse,
): Promise<void> {
	if (!body) {
		response.end();
		return;
	}

	const reader = body.getReader();
	try {
		let streamDone = false;
		while (!streamDone) {
			const result = await reader.read();
			streamDone = result.done;
			if (result.value) response.write(Buffer.from(result.value));
		}
		response.end();
	} finally {
		reader.releaseLock();
	}
}
