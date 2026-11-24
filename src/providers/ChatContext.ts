import { createContext } from 'react';

import type { Conversation, ProviderId } from '@/libs/providers';

type ChatContextProps = {
	sendPrompt: (prompt: string, images?: string[]) => Promise<void>;
	setPrompt: React.Dispatch<React.SetStateAction<string>>;
	startNewChat: () => void;
	openConversation: (conversationId: string) => void;
	setProviderEnabled: (provider: ProviderId, enabled: boolean) => void;
	recentChats: { id: string; title: string }[];
	prompt: string;
	turns: Conversation['turns'];
	providerEnabled: Record<ProviderId, boolean>;
	retryProvider: (provider: ProviderId, turnId: string) => Promise<void>;
	responseId: number;
	isGenerating: boolean;
	showResult: boolean;
	storageError: string | null;
};

export const ChatContext = createContext<ChatContextProps>({
	sendPrompt: async () => {},
	setPrompt: () => {},
	startNewChat: () => {},
	openConversation: () => {},
	setProviderEnabled: () => {},
	recentChats: [],
	prompt: '',
	turns: [],
	providerEnabled: {
		gemini: true,
		groq: true,
		cerebras: true,
		mistral: true,
	},
	retryProvider: async () => {},
	responseId: 0,
	isGenerating: false,
	showResult: false,
	storageError: null,
});
