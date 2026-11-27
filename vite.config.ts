import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import type { ProviderId } from './src/libs/providers';
import { handleProviderChatRequest } from './src/server/providerChat';
import { writeResponseStream } from './src/server/writeResponseStream';

const providerDevApi = (
	getApiKeys: () => Partial<Record<ProviderId, string>>,
): Plugin => ({
	name: 'provider-dev-api',
	configureServer(server) {
		server.middlewares.use('/api/chat', async (req, res) => {
			try {
				const chunks: Buffer[] = [];
				for await (const chunk of req) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				}

				const request = new Request(`http://localhost${req.url ?? '/'}`, {
					method: req.method ?? 'POST',
					headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
					...(req.method === 'GET' || req.method === 'HEAD'
						? {}
						: { body: Buffer.concat(chunks).toString('utf8') }),
				});
				const providerName =
					new URL(request.url).pathname.split('/').filter(Boolean).at(-1) ?? '';
				const response = await handleProviderChatRequest(
					request,
					providerName,
					getApiKeys(),
				);

				res.statusCode = response.status;
				response.headers.forEach((value, name) => res.setHeader(name, value));
				await writeResponseStream(response.body, res);
			} catch (error) {
				server.config.logger.error('Local provider endpoint failed', { error });
				if (res.headersSent) {
					if (error instanceof Error) res.destroy(error);
					else res.destroy();
					return;
				}
				res.statusCode = 500;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: { message: 'Local provider endpoint failed.' } }));
			}
		});
	},
});

export default defineConfig(({ mode }) => {
	const getApiKeys = (): Partial<Record<ProviderId, string>> => {
		const env = loadEnv(mode, process.cwd(), '');
		return {
			gemini: env.GROQ_API_KEY,
			groq: env.GROQ_API_KEY_2,
			cerebras: env.GROQ_API_KEY_3,
			mistral: env.GROQ_API_KEY_4,
		};
	};

	return {
		plugins: [react(), providerDevApi(getApiKeys)],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
			},
		},
	};
});
