import { useEffect, useState } from 'react';

import type {
	ChatTurn,
	Conversation,
	LegacyProviderId,
	ProviderId,
	ProviderMessage,
	ProviderResponse,
} from '@/libs/providers';
import { LEGACY_PROVIDER_IDS, PROVIDER_IDS } from '@/libs/providers';
import { runProviderChat } from '@/libs/providerChat';
import { ChatContext } from './ChatContext';

const CONVERSATIONS_KEY = 'ostra-conversations-v1';
const PROVIDERS_KEY = 'ostra-provider-enabled-v2';
const DEFAULT_ENABLED: Record<ProviderId, boolean> = {
	gemini: true,
	groq: true,
	cerebras: true,
	mistral: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);

const isProviderResponse = (value: unknown): value is ProviderResponse =>
	isRecord(value) &&
	typeof value.content === 'string' &&
	(value.status === 'loading' ||
		value.status === 'success' ||
		value.status === 'error' ||
		value.status === 'disabled') &&
	(value.error === undefined || typeof value.error === 'string');

const isChatTurn = (value: unknown): value is ChatTurn => {
	if (
		!isRecord(value) ||
		typeof value.id !== 'string' ||
		typeof value.prompt !== 'string' ||
		!Array.isArray(value.images) ||
		!value.images.every((image) => typeof image === 'string') ||
		!isRecord(value.responses)
	) {
		return false;
	}
	const responseMap = value.responses;
	if (!isRecord(responseMap)) return false;
	const legacyResponses = value.legacyResponses;
	const responseIds = [...PROVIDER_IDS, ...LEGACY_PROVIDER_IDS];
	return (
		responseIds.some((provider) => isProviderResponse(responseMap[provider])) &&
		responseIds.every(
			(provider) =>
				responseMap[provider] === undefined ||
				isProviderResponse(responseMap[provider]),
		) &&
		(legacyResponses === undefined ||
			(isRecord(legacyResponses) &&
				LEGACY_PROVIDER_IDS.every(
					(provider) =>
						legacyResponses[provider] === undefined ||
						isProviderResponse(legacyResponses[provider]),
				)))
	);
};

const normalizeSavedResponse = (
	saved: ProviderResponse | undefined,
): ProviderResponse =>
	!saved
		? {
				content: '',
				status: 'error',
				error: 'This model did not participate in this saved conversation.',
			}
		: saved.status === 'loading'
			? {
					content: saved.content,
					status: 'error',
					error: 'Generation was interrupted before this chat was closed.',
				}
			: saved;

const loadConversations = (): Conversation[] => {
	try {
		const stored = window.localStorage.getItem(CONVERSATIONS_KEY);
		if (!stored) return [];
		const parsed: unknown = JSON.parse(stored);
		if (
			!Array.isArray(parsed) ||
			!parsed.every(
				(item) =>
					isRecord(item) &&
					typeof item.id === 'string' &&
					typeof item.title === 'string' &&
					typeof item.updatedAt === 'number' &&
					Array.isArray(item.turns) &&
					item.turns.every(isChatTurn),
			)
		) {
			throw new Error('Saved chat history has an unsupported format.');
		}
		return (parsed as Conversation[]).map((conversation) => ({
			...conversation,
			turns: conversation.turns.map((turn) => ({
				...turn,
				responses: PROVIDER_IDS.reduce(
					(responses, provider) => {
						responses[provider] = normalizeSavedResponse(
							turn.responses[provider],
						);
						return responses;
					},
					{} as ChatTurn['responses'],
				),
				legacyResponses: LEGACY_PROVIDER_IDS.reduce(
					(responses, provider: LegacyProviderId) => {
						const savedTurn = turn as ChatTurn & {
							responses: Record<string, ProviderResponse>;
						};
						const saved =
							turn.legacyResponses?.[provider] ?? savedTurn.responses[provider];
						if (saved) responses[provider] = normalizeSavedResponse(saved);
						return responses;
					},
					{} as NonNullable<ChatTurn['legacyResponses']>,
				),
			})),
		}));
	} catch (error) {
		console.error('Could not restore Ostra chat history.', error);
		return [];
	}
};

const loadProviderSettings = (): Record<ProviderId, boolean> => {
	try {
		const stored = window.localStorage.getItem(PROVIDERS_KEY);
		if (!stored) return DEFAULT_ENABLED;
		const parsed: unknown = JSON.parse(stored);
		if (!isRecord(parsed)) return DEFAULT_ENABLED;
		return PROVIDER_IDS.reduce<Record<ProviderId, boolean>>(
			(settings, provider) => {
				settings[provider] =
					typeof parsed[provider] === 'boolean'
						? parsed[provider]
						: DEFAULT_ENABLED[provider];
				return settings;
			},
			{ ...DEFAULT_ENABLED },
		);
	} catch (error) {
		console.error('Could not restore Ostra model settings.', error);
		return DEFAULT_ENABLED;
	}
};

const responseFor = (status: ProviderResponse['status']): ProviderResponse => ({
	content: '',
	status,
});

const buildMessages = (
	turns: ChatTurn[],
	provider: ProviderId,
	prompt: string,
	images: string[],
): ProviderMessage[] => {
	const messages: ProviderMessage[] = [];
	for (const turn of turns) {
		const turnContent: ProviderMessage['content'] = turn.images.length
			? [
					{ type: 'text', text: turn.prompt || 'Analyze this image.' },
					...turn.images.map((url) => ({
						type: 'image_url' as const,
						image_url: { url },
					})),
				]
			: turn.prompt;
		messages.push({ role: 'user', content: turnContent });
		const answer = turn.responses[provider];
		if (answer.status === 'success' && answer.content) {
			messages.push({ role: 'assistant', content: answer.content });
		}
	}

	const currentContent: ProviderMessage['content'] = images.length
		? [
				{ type: 'text', text: prompt || 'Analyze this image.' },
				...images.map((url) => ({
					type: 'image_url' as const,
					image_url: { url },
				})),
			]
		: prompt;
	messages.push({ role: 'user', content: currentContent });

	let imageCount = 0;
	let imageDataLength = 0;
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.role !== 'user' || typeof message.content === 'string')
			continue;
		const content = message.content.filter((part) => {
			if (part.type !== 'image_url') return true;
			if (
				imageCount >= 4 ||
				imageDataLength + part.image_url.url.length > 4_000_000
			) {
				return false;
			}
			imageCount += 1;
			imageDataLength += part.image_url.url.length;
			return true;
		});
		messages[index] = { ...message, content };
	}
	return messages;
};

const ChatContextProvider = ({ children }: React.PropsWithChildren) => {
	const [conversations, setConversations] =
		useState<Conversation[]>(loadConversations);
	const [activeConversationId, setActiveConversationId] = useState<
		string | null
	>(() => conversations[0]?.id ?? null);
	const [providerEnabled, setProviderEnabled] =
		useState<Record<ProviderId, boolean>>(loadProviderSettings);
	const [prompt, setPrompt] = useState('');
	const [responseId, setResponseId] = useState(0);
	const [storageError, setStorageError] = useState<string | null>(null);

	const activeConversation =
		conversations.find(
			(conversation) => conversation.id === activeConversationId,
		) ?? null;
	const turns = activeConversation?.turns ?? [];
	const isGenerating = turns.some((turn) =>
		PROVIDER_IDS.some(
			(provider) => turn.responses[provider].status === 'loading',
		),
	);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			try {
				window.localStorage.setItem(
					CONVERSATIONS_KEY,
					JSON.stringify(conversations),
				);
				setStorageError(null);
			} catch (error) {
				console.error('Could not save Ostra chat history.', error);
				setStorageError(
					'Chat history could not be saved in this browser. You can continue chatting, but it may not be restored after closing this tab.',
				);
			}
		}, 250);
		return () => window.clearTimeout(timeout);
	}, [conversations]);

	useEffect(() => {
		try {
			window.localStorage.setItem(
				PROVIDERS_KEY,
				JSON.stringify(providerEnabled),
			);
		} catch (error) {
			console.error('Could not save Ostra model settings.', error);
		}
	}, [providerEnabled]);

	const handleNewChat = () => {
		setActiveConversationId(null);
		setPrompt('');
		setResponseId((id) => id + 1);
	};

	const handleOpenConversation = (conversationId: string) => {
		const conversation = conversations.find(
			(item) => item.id === conversationId,
		);
		if (!conversation) return;
		setActiveConversationId(conversation.id);
		setPrompt('');
		setResponseId((id) => id + 1);
	};

	const updateResponse = (
		conversationId: string,
		turnId: string,
		provider: ProviderId,
		update: (response: ProviderResponse) => ProviderResponse,
	) => {
		setConversations((current) =>
			current.map((conversation) =>
				conversation.id !== conversationId
					? conversation
					: {
							...conversation,
							turns: conversation.turns.map((turn) =>
								turn.id !== turnId
									? turn
									: {
											...turn,
											responses: {
												...turn.responses,
												[provider]: update(turn.responses[provider]),
											},
										},
							),
						},
			),
		);
	};

	const handleSendPrompt = async (
		promptText: string,
		images: string[] = [],
	) => {
		const cleanPrompt = promptText.trim();
		const title = cleanPrompt || 'Analyze this image.';
		const previousTurns = activeConversation?.turns ?? [];
		const conversationId = activeConversationId ?? crypto.randomUUID();
		const turnId = crypto.randomUUID();
		const enabledProviders = PROVIDER_IDS.filter(
			(provider) => providerEnabled[provider],
		);
		const responses = PROVIDER_IDS.reduce(
			(result, provider) => {
				result[provider] = responseFor(
					providerEnabled[provider] ? 'loading' : 'disabled',
				);
				return result;
			},
			{} as Record<ProviderId, ProviderResponse>,
		);
		const turn: ChatTurn = {
			id: turnId,
			prompt: cleanPrompt,
			images,
			responses,
		};
		const conversation: Conversation = activeConversation
			? {
					...activeConversation,
					updatedAt: Date.now(),
					turns: [...activeConversation.turns, turn],
				}
			: {
					id: conversationId,
					title,
					updatedAt: Date.now(),
					turns: [turn],
				};

		setActiveConversationId(conversationId);
		setConversations((current) => [
			conversation,
			...current.filter((item) => item.id !== conversationId),
		]);
		setPrompt('');
		setResponseId((id) => id + 1);

		await Promise.all(
			enabledProviders.map(async (provider) => {
				const messages = buildMessages(
					previousTurns,
					provider,
					cleanPrompt,
					images,
				);
				const result = await runProviderChat(provider, messages, (chunk) => {
					updateResponse(conversationId, turnId, provider, (response) => ({
						...response,
						content: response.content + chunk,
					}));
				});
				updateResponse(conversationId, turnId, provider, () => ({
					content: result.data ?? '',
					status: result.error ? 'error' : 'success',
					...(result.error ? { error: result.error } : {}),
				}));
			}),
		);
	};

	const handleRetryProvider = async (provider: ProviderId, turnId: string) => {
		if (!providerEnabled[provider] || !activeConversation) return;
		const turnIndex = activeConversation.turns.findIndex(
			(turn) => turn.id === turnId,
		);
		if (turnIndex < 0) return;
		const turn = activeConversation.turns[turnIndex];

		updateResponse(activeConversation.id, turnId, provider, () =>
			responseFor('loading'),
		);
		const messages = buildMessages(
			activeConversation.turns.slice(0, turnIndex),
			provider,
			turn.prompt,
			turn.images,
		);
		const result = await runProviderChat(provider, messages, (chunk) => {
			updateResponse(activeConversation.id, turnId, provider, (response) => ({
				...response,
				content: response.content + chunk,
			}));
		});
		updateResponse(activeConversation.id, turnId, provider, () => ({
			content: result.data ?? '',
			status: result.error ? 'error' : 'success',
			...(result.error ? { error: result.error } : {}),
		}));
	};

	return (
		<ChatContext.Provider
			value={{
				sendPrompt: handleSendPrompt,
				setPrompt,
				startNewChat: handleNewChat,
				openConversation: handleOpenConversation,
				setProviderEnabled: (provider, enabled) =>
					setProviderEnabled((current) => ({
						...current,
						[provider]: enabled,
					})),
				recentChats: conversations
					.slice()
					.map(({ id, title }) => ({ id, title })),
				prompt,
				turns,
				providerEnabled,
				retryProvider: handleRetryProvider,
				responseId,
				isGenerating,
				showResult: turns.length > 0,
				storageError,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
};

export { ChatContextProvider };
