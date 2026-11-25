import {
	Check,
	Code,
	Compass,
	Copy,
	DraftingCompass,
	ImagePlus,
	Lightbulb,
	Loader,
	Mic,
	Plus,
	SendHorizonal,
	ThumbsDown,
	ThumbsUp,
	X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useContext, useEffect, useRef, useState } from 'react';
import remarkGfm from 'remark-gfm';

import type { ProviderId } from '@/libs/providers';
import { ChatContext } from '@/providers/ChatContext';

const MAX_IMAGES = 4;
const MAX_TOTAL_IMAGE_SIZE = 2.5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
]);
const PROVIDERS: {
	id: ProviderId;
	name: string;
	logo: string;
}[] = [
	{
		id: 'gemini',
		name: 'Gemini',
		logo: 'https://cdn.freebiesupply.com/logos/large/2x/google-gemini-icon.png',
	},
	{
		id: 'groq',
		name: 'Groq',
		logo: 'https://cdn.freebiesupply.com/logos/large/2x/google-gemini-icon.png',
	},
	{
		id: 'cerebras',
		name: 'Cerebras',
		logo: 'https://logoeps.com/wp-content/uploads/2025/02/DeepSeek_logo_icon.png',
	},
	{
		id: 'mistral',
		name: 'Mistral',
		logo: 'https://images.seeklogo.com/logo-png/61/3/perplexity-ai-icon-black-logo-png_seeklogo-611679.png',
	},
];

const readImage = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result);
			else reject(new Error(`Could not read ${file.name}.`));
		};
		reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
		reader.readAsDataURL(file);
	});

const Main = () => {
	const {
		sendPrompt,
		setPrompt,
		turns,
		prompt,
		responseId,
		isGenerating,
		showResult,
		providerEnabled,
		setProviderEnabled,
		retryProvider,
		storageError,
	} = useContext(ChatContext);
	const [votes, setVotes] = useState<
		Record<string, 'like' | 'dislike' | undefined>
	>({});
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [selectedImages, setSelectedImages] = useState<
		{ file: File; previewUrl: string }[]
	>([]);
	const [isPreparingImages, setIsPreparingImages] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);
	const [isListening, setIsListening] = useState(false);
	const [voiceError, setVoiceError] = useState<string | null>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const imagePreviewUrls = useRef<string[]>([]);
	const speechRecognition = useRef<BrowserSpeechRecognition | null>(null);
	const activeProviders = PROVIDERS.filter(
		(provider) => providerEnabled[provider.id],
	);
	const inactiveProviders = PROVIDERS.filter(
		(provider) => !providerEnabled[provider.id],
	);

	useEffect(
		() => () => {
			imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
			speechRecognition.current?.stop();
		},
		[],
	);

	useEffect(() => {
		setVotes({});
		setCopiedKey(null);
		setCopyError(null);
	}, [responseId]);

	const handleSendPrompt = () => {
		if (
			isGenerating ||
			isPreparingImages ||
			(!prompt.trim() && !selectedImages.length)
		) {
			return;
		}

		setImageError(null);
		setIsPreparingImages(true);
		void Promise.all(selectedImages.map(({ file }) => readImage(file)))
			.then(async (images) => {
				setSelectedImages([]);
				imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
				imagePreviewUrls.current = [];
				if (imageInputRef.current) imageInputRef.current.value = '';
				await sendPrompt(prompt, images);
			})
			.catch((error: unknown) => {
				setImageError(
					error instanceof Error
						? error.message
						: 'Could not read attached images.',
				);
			})
			.finally(() => setIsPreparingImages(false));
	};

	const handleImageSelection = (files: FileList | null) => {
		if (!files?.length) return;

		const pickedFiles = Array.from(files);
		if (pickedFiles.some((file) => !SUPPORTED_IMAGE_TYPES.has(file.type))) {
			setImageError('Choose JPEG, PNG, or WebP images.');
			return;
		}
		if (selectedImages.length + pickedFiles.length > MAX_IMAGES) {
			setImageError(`You can attach up to ${MAX_IMAGES} images per message.`);
			return;
		}
		const selectedSize = selectedImages.reduce(
			(total, image) => total + image.file.size,
			0,
		);
		const addedSize = pickedFiles.reduce((total, file) => total + file.size, 0);
		if (selectedSize + addedSize > MAX_TOTAL_IMAGE_SIZE) {
			setImageError('Keep the combined image size under 2.5 MB.');
			return;
		}

		const newImages = pickedFiles.map((file) => {
			const previewUrl = URL.createObjectURL(file);
			imagePreviewUrls.current.push(previewUrl);
			return { file, previewUrl };
		});
		setSelectedImages((images) => [...images, ...newImages]);
		setImageError(null);
	};

	const removeSelectedImage = (previewUrl: string) => {
		URL.revokeObjectURL(previewUrl);
		imagePreviewUrls.current = imagePreviewUrls.current.filter(
			(url) => url !== previewUrl,
		);
		setSelectedImages((images) =>
			images.filter((image) => image.previewUrl !== previewUrl),
		);
	};

	const toggleVoiceInput = () => {
		if (speechRecognition.current) {
			speechRecognition.current.stop();
			return;
		}

		const SpeechRecognition =
			window.SpeechRecognition ?? window.webkitSpeechRecognition;
		if (!SpeechRecognition) {
			setVoiceError(
				'Voice input is not supported in this browser. Try Chrome or Edge.',
			);
			return;
		}

		const recognition = new SpeechRecognition();
		recognition.lang = navigator.language;
		recognition.interimResults = false;
		recognition.continuous = false;
		recognition.onresult = (event) => {
			const transcript = event.results[0]?.[0]?.transcript.trim();
			if (transcript) {
				setPrompt((current) =>
					[current.trim(), transcript].filter(Boolean).join(' '),
				);
			}
		};
		recognition.onerror = (event) => {
			setVoiceError(
				event.error === 'not-allowed'
					? 'Allow microphone access in your browser to use voice input.'
					: `Voice input failed: ${event.error}.`,
			);
			setIsListening(false);
			speechRecognition.current = null;
		};
		recognition.onend = () => {
			setIsListening(false);
			speechRecognition.current = null;
		};

		try {
			speechRecognition.current = recognition;
			setVoiceError(null);
			setIsListening(true);
			recognition.start();
		} catch (error) {
			speechRecognition.current = null;
			setIsListening(false);
			setVoiceError(
				error instanceof Error ? error.message : 'Could not start voice input.',
			);
		}
	};

	const handleCopy = async (content: string, key: string) => {
		try {
			await navigator.clipboard.writeText(content);
			setCopiedKey(key);
			setCopyError(null);
		} catch (error) {
			setCopiedKey(null);
			setCopyError(
				error instanceof Error ? error.message : 'Could not copy response.',
			);
		}
	};

	return (
		<div className='relative h-screen flex-1 pb-[15vh]'>
			<nav className='flex w-full items-center justify-between gap-3 px-5 py-[1.375rem] text-base font-light text-brand-300'>
				<div className='flex items-center gap-2'>
					<img
						className='h-7 w-7 rounded-full object-contain'
						src='/ostra-logo.png'
						alt=''
					/>
					<p className='whitespace-nowrap'>Ostra</p>
				</div>
			</nav>

			<div className='w-full'>
				{!showResult ? (
					<div className='no-scrollbar mx-auto h-[calc(100vh-5.25rem)] w-full max-w-[55rem] overflow-y-scroll px-[5%] pb-40'>
						<div className='my-14 p-5 text-6xl font-medium'>
							<p className='text-brand-400'>
								<span className='bg-gradient-to-br from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]'>
									Hello, Human
								</span>

								<span className='block'>How can I help you today?</span>
							</p>
						</div>

						<div className='grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 p-5'>
							{[
								{
									label: 'Brainstorm presentation ideas about a topic',
									Icon: Compass,
								},
								{
									label: 'Suggest a Python library to solve a problem',
									Icon: Code,
								},
								{
									label:
										'Provide questions to help me prepare for an interview',
									Icon: DraftingCompass,
								},
								{
									label: 'Help me compare these college majors',
									Icon: Lightbulb,
								},
							].map(({ label, Icon }, idx) => (
								<div
									className='relative h-52 cursor-pointer rounded-xl bg-brand-100 p-4 duration-300 hover:bg-brand-400'
									key={idx}
								>
									<p className='text-brand-300'>{label}</p>

									<div className='absolute bottom-4 right-4 rounded-full bg-white p-2'>
										<Icon size={20} />
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className='h-[calc(100vh-5.25rem)] w-full overflow-x-auto overflow-y-hidden px-3 pb-40'>
						{storageError && (
							<p role='alert' className='mx-4 mt-2 text-sm text-red-600'>
								{storageError}
							</p>
						)}
						<div className='flex h-[calc(100vh-11.5rem)] min-w-[880px]'>
							{activeProviders.length > 0 ? (
								<div
									className='grid min-w-0 flex-1'
									style={{
										gridTemplateColumns: `repeat(${activeProviders.length}, minmax(0, 1fr))`,
									}}
								>
									{activeProviders.map((provider, providerIndex) => (
										<section
											key={provider.id}
											aria-label={`${provider.name} responses`}
											className={`flex min-h-0 flex-col border-r border-brand-200 ${
												providerIndex === 0 ? 'border-l' : ''
											}`}
										>
											<header className='flex h-12 shrink-0 items-center justify-between gap-2 border-b border-brand-200 px-3'>
												<div className='flex min-w-0 items-center gap-2'>
													<img
														className='h-5 w-5 shrink-0 object-contain'
														src={provider.logo}
														alt=''
													/>
													<span className='truncate text-sm font-medium'>
														{provider.name}
													</span>
												</div>
												<button
													type='button'
													aria-label={`Disable ${provider.name}`}
													title={`Remove ${provider.name}`}
													onClick={() => setProviderEnabled(provider.id, false)}
													className='grid h-7 w-7 shrink-0 place-items-center rounded-full text-brand-300 transition-colors hover:bg-brand-100 hover:text-brand-400'
												>
													<X size={16} />
												</button>
											</header>

											<div className='no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4'>
												{turns.map((turn) => {
													const response = turn.responses[provider.id];
													const responseKey = `${turn.id}:${provider.id}`;
													const vote = votes[responseKey];
													return (
														<article
															key={turn.id}
															className='mb-6 border-b border-brand-200 pb-5 last:border-0'
														>
															<p className='mb-2 text-xs font-medium text-brand-300'>
																You
															</p>
															<p className='whitespace-pre-wrap break-words text-sm leading-6'>
																{turn.prompt || 'Analyze this image.'}
															</p>
															{turn.images.length > 0 && (
																<div className='my-3 flex flex-wrap gap-2'>
																	{turn.images.map((image, imageIndex) => (
																		<img
																			key={`${turn.id}-${imageIndex}`}
																			src={image}
																			alt={`Attached image ${imageIndex + 1}`}
																			className='max-h-24 max-w-full rounded-md object-contain'
																		/>
																	))}
																</div>
															)}

															<div className='mt-4 min-h-8'>
																{response.content && (
																	<div className='markdown-response answer-animated min-w-0 break-words text-[0.9375rem] font-light'>
																		<ReactMarkdown remarkPlugins={[remarkGfm]}>
																			{response.content}
																		</ReactMarkdown>
																	</div>
																)}
																{response.status === 'loading' && (
																	<div
																		className='mt-3 flex items-center gap-2 text-sm text-brand-300'
																		role='status'
																	>
																		<Loader
																			className='animate-spin'
																			size={14}
																		/>
																		<span>
																			{response.content
																				? 'Writing response…'
																				: 'Thinking…'}
																		</span>
																	</div>
																)}
																{response.status === 'error' && (
																	<div className='mt-2'>
																		<p
																			role='alert'
																			className='text-sm text-red-600'
																		>
																			{response.error ??
																				'This provider request failed.'}
																		</p>
																		<button
																			type='button'
																			className='mt-1 text-xs font-medium text-blue-700 underline disabled:cursor-not-allowed disabled:opacity-50'
																			disabled={!providerEnabled[provider.id]}
																			onClick={() =>
																				retryProvider(provider.id, turn.id)
																			}
																		>
																			Retry
																		</button>
																	</div>
																)}
																{response.status === 'disabled' && (
																	<p className='mt-2 text-sm text-brand-300'>
																		Not requested — this model was off when you
																		sent the prompt.
																	</p>
																)}
															</div>

															{response.status === 'success' &&
																response.content && (
																	<div className='mt-2 flex items-center gap-1 text-brand-300'>
																		<button
																			type='button'
																			onClick={() =>
																				setVotes((current) => ({
																					...current,
																					[responseKey]:
																						vote === 'like'
																							? undefined
																							: 'like',
																				}))
																			}
																			className={`rounded-md p-1.5 transition-colors hover:bg-brand-100 ${
																				vote === 'like'
																					? 'bg-brand-100 text-blue-600'
																					: ''
																			}`}
																			aria-label='Like response'
																			aria-pressed={vote === 'like'}
																			title='Like response'
																		>
																			<ThumbsUp size={14} />
																		</button>
																		<button
																			type='button'
																			onClick={() =>
																				setVotes((current) => ({
																					...current,
																					[responseKey]:
																						vote === 'dislike'
																							? undefined
																							: 'dislike',
																				}))
																			}
																			className={`rounded-md p-1.5 transition-colors hover:bg-brand-100 ${
																				vote === 'dislike'
																					? 'bg-brand-100 text-blue-600'
																					: ''
																			}`}
																			aria-label='Dislike response'
																			aria-pressed={vote === 'dislike'}
																			title='Dislike response'
																		>
																			<ThumbsDown size={14} />
																		</button>
																		<button
																			type='button'
																			onClick={() =>
																				void handleCopy(
																					response.content,
																					responseKey,
																				)
																			}
																			className='rounded-md p-1.5 transition-colors hover:bg-brand-100'
																			aria-label={
																				copiedKey === responseKey
																					? 'Response copied'
																					: 'Copy response'
																			}
																			title={
																				copiedKey === responseKey
																					? 'Copied'
																					: 'Copy response'
																			}
																		>
																			{copiedKey === responseKey ? (
																				<Check size={14} />
																			) : (
																				<Copy size={14} />
																			)}
																		</button>
																		{copiedKey === responseKey && (
																			<span role='status' className='text-xs'>
																				Copied
																			</span>
																		)}
																		{copyError && (
																			<span
																				role='alert'
																				className='text-xs text-red-500'
																			>
																				{copyError}
																			</span>
																		)}
																	</div>
																)}
														</article>
													);
												})}
											</div>
										</section>
									))}
								</div>
							) : (
								<div className='flex min-w-0 flex-1 items-center justify-center px-6 text-center text-sm text-brand-300'>
									All models are off. Add a model from the list on the right.
								</div>
							)}
							{inactiveProviders.length > 0 && (
								<aside
									aria-label='Available models'
									className='flex w-56 shrink-0 flex-col gap-2 border-l border-brand-200 px-3 py-3'
								>
									<p className='px-2 text-xs font-medium text-brand-300'>
										Add a model
									</p>
									{inactiveProviders.map((provider) => (
										<button
											key={provider.id}
											type='button'
											onClick={() => setProviderEnabled(provider.id, true)}
											aria-label={`Enable ${provider.name}`}
											className='flex min-h-12 items-center justify-between gap-2 rounded-full border border-dashed border-brand-200 px-3 text-left text-sm text-brand-300 transition-colors hover:border-brand-300 hover:bg-brand-100'
										>
											<span className='flex min-w-0 items-center gap-2'>
												<img
													className='h-5 w-5 shrink-0 object-contain'
													src={provider.logo}
													alt=''
												/>
												<span className='truncate'>{provider.name}</span>
											</span>
											<Plus size={16} className='shrink-0' />
										</button>
									))}
								</aside>
							)}
						</div>
					</div>
				)}

				<div className='absolute bottom-0 left-1/2 mx-auto w-full max-w-[55rem] -translate-x-1/2 px-5 pt-4 backdrop-blur-sm'>
					{selectedImages.length > 0 && (
						<div className='mb-3 flex flex-wrap gap-3'>
							{selectedImages.map(({ file, previewUrl }) => (
								<div className='relative' key={previewUrl}>
									<img
										src={previewUrl}
										alt={file.name}
										className='h-16 w-16 rounded-lg object-cover'
									/>
									<button
										type='button'
										onClick={() => removeSelectedImage(previewUrl)}
										disabled={isGenerating || isPreparingImages}
										className='absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-sm text-white'
										aria-label={`Remove ${file.name}`}
										title={`Remove ${file.name}`}
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
					{imageError && (
						<p role='alert' className='mb-2 text-sm text-red-500'>
							{imageError}
						</p>
					)}
					{voiceError && (
						<p role='alert' className='mb-2 text-sm text-red-500'>
							{voiceError}
						</p>
					)}
					<div className='flex items-center justify-between gap-5 rounded-full bg-brand-100 px-5 py-3'>
						<input
							ref={imageInputRef}
							type='file'
							accept='image/jpeg,image/png,image/webp'
							multiple
							className='hidden'
							aria-label='Choose images to attach'
							onChange={(event) => {
								handleImageSelection(event.target.files);
								event.target.value = '';
							}}
							disabled={isGenerating || isPreparingImages}
						/>
						<input
							onChange={(e) => setPrompt(e.target.value)}
							onKeyDown={(e) =>
								e.key === 'Enter' &&
								(prompt.trim() || selectedImages.length > 0) &&
								handleSendPrompt()
							}
							className='flex-1 border-none bg-transparent text-black outline-none'
							type='text'
							placeholder={
								selectedImages.length
									? 'Ask about your image'
									: 'Enter a prompt here'
							}
							value={prompt}
							disabled={isGenerating || isPreparingImages}
						/>

						<div className='flex items-center gap-5 text-brand-300'>
							<button
								type='button'
								onClick={() => imageInputRef.current?.click()}
								disabled={isGenerating || isPreparingImages}
								className='grid place-items-center disabled:opacity-50'
								aria-label='Attach images'
								title='Attach images'
							>
								<ImagePlus className='min-w-4' size={16} />
							</button>

							<button
								type='button'
								onClick={toggleVoiceInput}
								disabled={isGenerating || isPreparingImages}
								className={`grid place-items-center disabled:opacity-50 ${
									isListening ? 'text-red-500' : ''
								}`}
								aria-label={
									isListening ? 'Stop voice input' : 'Start voice input'
								}
								aria-pressed={isListening}
								title={isListening ? 'Stop voice input' : 'Start voice input'}
							>
								<Mic className='min-w-4' size={16} />
							</button>

							{!isGenerating &&
							!isPreparingImages &&
							(!!prompt.trim() || selectedImages.length > 0) ? (
								<SendHorizonal
									onClick={handleSendPrompt}
									className='min-w-4 cursor-pointer'
									size={16}
								/>
							) : null}

							{isGenerating || isPreparingImages ? (
								<Loader className='min-w-4 animate-spin' size={16} />
							) : null}
						</div>
					</div>

					<p className='mx-auto my-3 text-center text-xs font-light text-brand-300 sm:text-sm'>
						Ostra may display inaccurate info, including about people, so
						double-check its responses.
					</p>
				</div>
			</div>
		</div>
	);
};

export default Main;
