import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import { handleChatRequest } from './src/server/openrouter';
import { writeResponseStream } from './src/server/writeResponseStream';

const openRouterDevApi = (apiKey: string): Plugin => ({
	name: 'openrouter-dev-api',
	configureServer(server) {
		server.middlewares.use('/api/chat', async (req, res) => {
			try {
				const chunks: Buffer[] = [];
				for await (const chunk of req) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				}

				const request = new Request('http://localhost/api/chat', {
					method: req.method,
					headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
					body: Buffer.concat(chunks).toString('utf8'),
				});
				const response = await handleChatRequest(request, apiKey);

				res.statusCode = response.status;
				response.headers.forEach((value, name) => res.setHeader(name, value));
				await writeResponseStream(response.body, res);
			} catch (error) {
				server.config.logger.error('Local chat endpoint failed', { error });
				if (res.headersSent) {
					res.destroy(error instanceof Error ? error : undefined);
					return;
				}
				res.statusCode = 500;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ error: { message: 'Local chat endpoint failed.' } }));
			}
		});
	},
});

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [react(), openRouterDevApi(env.OPENROUTER_API_KEY)],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
			},
		},
	};
});
