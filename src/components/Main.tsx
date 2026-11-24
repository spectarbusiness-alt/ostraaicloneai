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
	SendHorizonal,
	ThumbsDown,
	ThumbsUp,
	UserRound,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useContext, useEffect, useRef, useState } from 'react';
import remarkGfm from 'remark-gfm';

import { ChatContext } from '@/providers/ChatContext';

const MAX_IMAGES = 4;
const MAX_TOTAL_IMAGE_SIZE = 2.5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
		recentPrompt,
		recentImages,
		turns,
		prompt,
		responseId,
		isPending,
		isGenerating,
		isError,
		output,
		showResult,
	} = useContext(ChatContext);
	const [vote, setVote] = useState<'like' | 'dislike' | null>(null);
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [selectedImages, setSelectedImages] = useState<
		{ file: File; previewUrl: string }[]
	>([]);
	const [isPreparingImages, setIsPreparingImages] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);
	const [isListening, setIsListening] = useState(false);
	const [voiceError, setVoiceError] = useState<string | null>(null);
	const answerRef = useRef<HTMLDivElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const imagePreviewUrls = useRef<string[]>([]);
	const speechRecognition = useRef<BrowserSpeechRecognition | null>(null);

	useEffect(
		() => () => {
			imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
			speechRecognition.current?.stop();
		},
		[],
	);

	useEffect(() => {
		setVote(null);
		setCopied(false);
		setCopyError(null);
	}, [responseId]);

	const handleSendPrompt = () => {
		if (isGenerating || isPreparingImages || (!prompt.trim() && !selectedImages.length)) {
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
					error instanceof Error ? error.message : 'Could not read attached images.',
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
		const selectedSize = selectedImages.reduce((total, image) => total + image.file.size, 0);
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
			setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
			return;
		}

		const recognition = new SpeechRecognition();
		recognition.lang = navigator.language;
		recognition.interimResults = false;
		recognition.continuous = false;
		recognition.onresult = (event) => {
			const transcript = event.results[0]?.[0]?.transcript.trim();
			if (transcript) {
				setPrompt((current) => [current.trim(), transcript].filter(Boolean).join(' '));
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

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(
				answerRef.current?.innerText ?? output,
			);
			setCopied(true);
			setCopyError(null);
		} catch (error) {
			setCopied(false);
			setCopyError(
				error instanceof Error ? error.message : 'Could not copy response.',
			);
		}
	};

	return (
		<div className='relative h-screen flex-1 pb-[15vh]'>
			<nav className='flex items-center justify-between gap-3 px-5 py-[1.375rem] text-base font-light text-brand-300'>
				<div className='flex items-center gap-2'>
					<img
						className='h-7 w-7 rounded-full object-contain'
						src='/ostra-logo.png'
						alt=''
					/>
					<p className='whitespace-nowrap'>Ostra</p>
				</div>

				<div className='flex items-center gap-3'>
					<div className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100'>
						<UserRound className='min-w-4' size={16} />
					</div>
				</div>
			</nav>

			<div className='mx-auto max-w-[55rem]'>
				{!showResult ? (
					<div className='no-scrollbar h-[calc(100vh-5.25rem)] overflow-y-scroll px-[5%] pb-40'>
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
					<div className='no-scrollbar h-[calc(100vh-5.25rem)] overflow-y-scroll px-[5%] pb-40'>
						{turns.map((turn, index) => (
							<div key={`${responseId}-history-${index}`}>
								<div className='my-10 flex items-center gap-5'>
									<div className='grid h-10 w-10 place-items-center rounded-full bg-brand-100'>
										<UserRound className='icon text-brand-300' />
									</div>
									<p>{turn.prompt || 'Analyze this image.'}</p>
								</div>
								{turn.images.length > 0 && (
									<div className='mb-6 ml-[3.75rem] flex flex-wrap gap-3'>
										{turn.images.map((image, imageIndex) => (
											<img
												key={`${responseId}-${index}-image-${imageIndex}`}
												src={image}
												alt={`Attached image ${imageIndex + 1}`}
												className='max-h-56 max-w-full rounded-xl object-contain'
											/>
										))}
									</div>
								)}
								<div className='mb-10 flex items-start gap-5'>
									<div className='grid h-10 min-w-10 place-items-center'>
										<img
											className='-mt-[0.5625rem] aspect-square w-7'
											src='/ostra-logo.png'
											alt='Ostra'
										/>
									</div>
									<div className='markdown-response min-w-0 flex-1 font-light'>
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{turn.response}
										</ReactMarkdown>
									</div>
								</div>
							</div>
						))}
						<div className='my-10 flex items-center gap-5'>
							<div className='grid h-10 w-10 place-items-center rounded-full bg-brand-100'>
								<UserRound className='icon text-brand-300' />
							</div>

							<p>{recentPrompt}</p>
						</div>
						{recentImages.length > 0 && (
							<div className='mb-6 ml-[3.75rem] flex flex-wrap gap-3'>
								{recentImages.map((image, index) => (
									<img
										key={`${responseId}-${index}`}
										src={image}
										alt={`Attached image ${index + 1}`}
										className='max-h-56 max-w-full rounded-xl object-contain'
									/>
								))}
							</div>
						)}

						<div className='flex items-start gap-5'>
							<div className='grid h-10 min-w-10 place-items-center'>
								<img
									className={`-mt-[0.5625rem] aspect-square w-7 duration-500 ${
										isPending
											? 'animate-pulse'
											: isGenerating
												? 'animate-spin'
												: 'rotate-0 [animation-play-state:pause]'
									}`}
									src='/ostra-logo.png'
									alt='Ostra'
								/>
							</div>

							{isPending ? (
								<div className='flex w-full flex-col gap-2'>
									<hr
										className={`mt-1.5 h-5 animate-background-pan rounded-md border-none bg-brand-100 bg-gradient-to-r from-[#9ed7ff] via-[#ffffff] to-[#9ed7ff] [animation-delay:100ms] [animation-duration:3s] [background-size:800px_50px]`}
									/>

									<hr
										className={`mt-1.5 h-5 animate-background-pan rounded-md border-none bg-brand-100 bg-gradient-to-r from-[#9ed7ff] via-[#ffffff] to-[#9ed7ff] [animation-delay:200ms] [animation-duration:2s] [background-size:800px_50px]`}
									/>

									<hr
										className={`mt-1.5 h-5 w-8/12 animate-background-pan rounded-md border-none bg-brand-100 bg-gradient-to-r from-[#9ed7ff] via-[#ffffff] to-[#9ed7ff] [animation-delay:300ms] [animation-duration:4s] [background-size:800px_50px]`}
									/>
								</div>
							) : (
								<div
									ref={answerRef}
									key={responseId}
									className={`markdown-response min-w-0 flex-1 font-light ${
										isError ? 'text-red-500' : 'answer-animated'
									}`}
								>
									<ReactMarkdown remarkPlugins={[remarkGfm]}>
										{output}
									</ReactMarkdown>
								</div>
							)}
						</div>

						{!isPending && !isError && output && (
							<div className='ml-[3.75rem] mt-3 flex items-center gap-1 text-brand-300'>
								<button
									type='button'
									onClick={() => setVote(vote === 'like' ? null : 'like')}
									className={`rounded-md p-2 transition-colors hover:bg-brand-100 ${
										vote === 'like' ? 'bg-brand-100 text-blue-600' : ''
									}`}
									aria-label='Like response'
									aria-pressed={vote === 'like'}
									title='Like response'
								>
									<ThumbsUp size={16} />
								</button>
								<button
									type='button'
									onClick={() => setVote(vote === 'dislike' ? null : 'dislike')}
									className={`rounded-md p-2 transition-colors hover:bg-brand-100 ${
										vote === 'dislike' ? 'bg-brand-100 text-blue-600' : ''
									}`}
									aria-label='Dislike response'
									aria-pressed={vote === 'dislike'}
									title='Dislike response'
								>
									<ThumbsDown size={16} />
								</button>
								<button
									type='button'
									onClick={handleCopy}
									className='rounded-md p-2 transition-colors hover:bg-brand-100'
									aria-label={copied ? 'Response copied' : 'Copy response'}
									title={copied ? 'Copied' : 'Copy response'}
								>
									{copied ? <Check size={16} /> : <Copy size={16} />}
								</button>
								{copied && (
									<span role='status' className='text-xs'>
										Copied
									</span>
								)}
								{copyError && (
									<span role='alert' className='text-xs text-red-500'>
										{copyError}
									</span>
								)}
							</div>
						)}
					</div>
				)}

				<div className='absolute bottom-0 mx-auto w-full max-w-[55rem] px-5 pt-4 backdrop-blur-sm'>
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
								selectedImages.length ? 'Ask about your image' : 'Enter a prompt here'
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
								aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
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
