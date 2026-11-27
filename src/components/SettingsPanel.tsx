import {
	Brain,
	Check,
	Crown,
	Gift,
	History,
	Monitor,
	Moon,
	Settings,
	SlidersHorizontal,
	Sun,
	UserRound,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

type SettingsPanelProps = {
	id: string;
	onClose: () => void;
};

type SettingsSectionId =
	| 'general'
	| 'ai-preferences'
	| 'memory'
	| 'subscription'
	| 'tokens-usage'
	| 'refer-and-earn'
	| 'profile';

type SettingsSection = {
	id: SettingsSectionId;
	label: string;
	description: string;
	overview: string;
	Icon: LucideIcon;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
	{
		id: 'general',
		label: 'General',
		description: 'Make Ostra look the way you like.',
		overview: 'Customize your language, appearance, accent color, and font.',
		Icon: Settings,
	},
	{
		id: 'ai-preferences',
		label: 'AI Preferences',
		description: 'Choose how Ostra responds to you.',
		overview: 'Set response preferences for your conversations.',
		Icon: SlidersHorizontal,
	},
	{
		id: 'memory',
		label: 'Memory',
		description: 'Manage what Ostra remembers between chats.',
		overview: 'Review the details and context used to personalize chats.',
		Icon: Brain,
	},
	{
		id: 'subscription',
		label: 'Subscription',
		description: 'Review your plan and available upgrades.',
		overview: 'See your current plan and subscription options.',
		Icon: Crown,
	},
	{
		id: 'tokens-usage',
		label: 'Tokens Usage',
		description: 'Review usage for your current plan.',
		overview: 'Keep track of usage across your conversations.',
		Icon: History,
	},
	{
		id: 'refer-and-earn',
		label: 'Refer & Earn',
		description: 'Invite people to explore Ostra.',
		overview: 'Share Ostra with friends and learn about referral rewards.',
		Icon: Gift,
	},
	{
		id: 'profile',
		label: 'Profile',
		description: 'Manage your account details.',
		overview: 'Update the details associated with your Ostra account.',
		Icon: UserRound,
	},
];

const LANGUAGES = [
	{ id: 'english', label: 'English', subtitle: undefined },
	{ id: 'hindi', label: 'हिन्दी', subtitle: 'Hindi' },
	{ id: 'bengali', label: 'বাংলা', subtitle: 'Bengali' },
] as const;

const APPEARANCE_OPTIONS = [
	{ label: 'System', Icon: Monitor },
	{ label: 'Light', Icon: Sun },
	{ label: 'Dark', Icon: Moon },
] as const;

const ACCENT_COLORS = [
	{ id: 'green', label: 'Green', className: 'bg-emerald-500' },
	{ id: 'blue', label: 'Blue', className: 'bg-blue-500' },
	{ id: 'violet', label: 'Violet', className: 'bg-violet-500' },
	{ id: 'orange', label: 'Orange', className: 'bg-orange-500' },
	{ id: 'red', label: 'Red', className: 'bg-rose-500' },
] as const;

type AccentColor = (typeof ACCENT_COLORS)[number]['id'];
type Appearance = (typeof APPEARANCE_OPTIONS)[number]['label'];
type Language = (typeof LANGUAGES)[number]['id'];

const FONT_OPTIONS = ['Google Sans Flex', 'Figtree'] as const;
type FontOption = (typeof FONT_OPTIONS)[number];

const SettingsPanel = ({ id, onClose }: SettingsPanelProps) => {
	const [activeSectionId, setActiveSectionId] =
		useState<SettingsSectionId>('general');
	const [language, setLanguage] = useState<Language>('english');
	const [appearance, setAppearance] = useState<Appearance>('Light');
	const [accentColor, setAccentColor] = useState<AccentColor>('green');
	const [font, setFont] = useState<FontOption>('Google Sans Flex');
	const activeSection =
		SETTINGS_SECTIONS.find((section) => section.id === activeSectionId) ??
		SETTINGS_SECTIONS[0];

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, []);

	return (
		<div
			className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px] sm:p-6'
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				id={id}
				role='dialog'
				aria-modal='true'
				aria-labelledby={`${id}-title`}
				aria-describedby={`${id}-description`}
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.stopPropagation();
						onClose();
					}
				}}
				className='sidebar-settings-enter flex h-[calc(100dvh-2rem)] w-full max-w-[62rem] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:h-[min(85dvh,48rem)] sm:flex-row'
			>
				<aside className='flex w-full shrink-0 flex-col border-b border-stone-200 px-5 py-4 sm:w-[18.125rem] sm:border-b-0 sm:border-r sm:px-6 sm:py-6'>
					<h2
						id={`${id}-title`}
						className='text-[1.55rem] font-semibold leading-tight text-stone-950'
					>
						Settings
					</h2>
					<nav
						aria-label='Settings categories'
						className='mt-3 flex gap-1 overflow-x-auto pb-1 sm:mt-6 sm:flex-col sm:overflow-y-auto sm:overflow-x-visible sm:pb-0'
					>
						{SETTINGS_SECTIONS.map(({ id: sectionId, label, Icon }) => {
							const isActive = activeSectionId === sectionId;
							return (
								<button
									key={sectionId}
									type='button'
									aria-current={isActive ? 'page' : undefined}
									onClick={() => setActiveSectionId(sectionId)}
									className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-left text-[0.94rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:w-full ${
										isActive
											? 'bg-[#f1eff0] text-stone-950'
											: 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
									}`}
								>
									<Icon size={19} strokeWidth={1.8} aria-hidden='true' />
									<span className='whitespace-nowrap'>{label}</span>
								</button>
							);
						})}
					</nav>
				</aside>

				<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
					<header className='flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6'>
						<div className='min-w-0'>
							<h1 className='text-[1.55rem] font-normal leading-tight text-stone-950'>
								{activeSection.label}
							</h1>
							<p
								id={`${id}-description`}
								className='mt-1 text-sm text-stone-500'
							>
								{activeSection.description}
							</p>
						</div>
						<button
							type='button'
							autoFocus
							onClick={onClose}
							aria-label='Close settings'
							className='grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
						>
							<X size={20} strokeWidth={1.6} aria-hidden='true' />
						</button>
					</header>

					<div className='no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-7 sm:px-6 sm:pb-8'>
						{activeSectionId === 'general' ? (
							<GeneralSettings
								language={language}
								setLanguage={setLanguage}
								appearance={appearance}
								setAppearance={setAppearance}
								accentColor={accentColor}
								setAccentColor={setAccentColor}
								font={font}
								setFont={setFont}
							/>
						) : (
							<SectionOverview section={activeSection} />
						)}
					</div>
				</div>
			</section>
		</div>
	);
};

type GeneralSettingsProps = {
	language: Language;
	setLanguage: (language: Language) => void;
	appearance: Appearance;
	setAppearance: (appearance: Appearance) => void;
	accentColor: AccentColor;
	setAccentColor: (accentColor: AccentColor) => void;
	font: FontOption;
	setFont: (font: FontOption) => void;
};

const GeneralSettings = ({
	language,
	setLanguage,
	appearance,
	setAppearance,
	accentColor,
	setAccentColor,
	font,
	setFont,
}: GeneralSettingsProps) => (
	<div>
		<section aria-labelledby='language-preferences-heading'>
			<h3
				id='language-preferences-heading'
				className='mb-3 text-[0.98rem] font-medium text-stone-800'
			>
				Language Preferences
			</h3>
			<div className='grid grid-cols-2 gap-2.5 max-[360px]:grid-cols-1'>
				{LANGUAGES.map(({ id, label, subtitle }) => {
					const isSelected = language === id;
					return (
						<button
							key={id}
							type='button'
							aria-pressed={isSelected}
							onClick={() => setLanguage(id)}
							className={`flex min-h-[4.65rem] items-center justify-between gap-3 rounded-[1.1rem] px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
								isSelected
									? 'bg-[#e3e4e9] text-stone-900'
									: 'bg-[#f8f8fa] text-stone-700 hover:bg-stone-100'
							}`}
						>
							<span className='min-w-0'>
								<span className='block truncate text-[0.98rem]'>{label}</span>
								{subtitle && (
									<span className='mt-0.5 block text-sm text-stone-500'>
										{subtitle}
									</span>
								)}
							</span>
							<span
								aria-hidden='true'
								className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
									isSelected
										? 'border-emerald-600 bg-emerald-600 text-white'
										: 'border-stone-300 bg-transparent'
								}`}
							>
								{isSelected && <Check size={16} strokeWidth={2.2} />}
							</span>
						</button>
					);
				})}
			</div>
		</section>

		<div className='my-6 border-t border-stone-200' />

		<section aria-labelledby='appearance-heading'>
			<h3
				id='appearance-heading'
				className='mb-4 text-[0.98rem] font-medium text-stone-800'
			>
				Appearance
			</h3>
			<div className='flex items-center gap-1 rounded-full border border-stone-100 p-1.5'>
				{APPEARANCE_OPTIONS.map(({ label, Icon }) => {
					const isSelected = appearance === label;
					return (
						<button
							key={label}
							type='button'
							aria-pressed={isSelected}
							onClick={() => setAppearance(label)}
							className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:gap-2.5 sm:text-[0.95rem] ${
								isSelected
									? 'bg-[#202327] text-white shadow-sm'
									: 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
							}`}
						>
							<Icon size={19} strokeWidth={1.7} aria-hidden='true' />
							<span>{label}</span>
						</button>
					);
				})}
			</div>
		</section>

		<div className='my-6 border-t border-stone-200' />

		<section aria-labelledby='accent-color-heading'>
			<h3
				id='accent-color-heading'
				className='mb-4 text-[0.98rem] font-medium text-stone-800'
			>
				Accent Color
			</h3>
			<div className='flex flex-wrap gap-3.5'>
				{ACCENT_COLORS.map(({ id, label, className }) => {
					const isSelected = accentColor === id;
					return (
						<button
							key={id}
							type='button'
							aria-label={`${label} accent color`}
							aria-pressed={isSelected}
							onClick={() => setAccentColor(id)}
							className={`grid h-12 w-12 place-items-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 sm:h-14 sm:w-14 ${className}`}
						>
							{isSelected && (
								<Check size={26} className='text-white' strokeWidth={2} />
							)}
						</button>
					);
				})}
			</div>
		</section>

		<div className='my-6 border-t border-stone-200' />

		<section aria-labelledby='font-heading' className='pb-2'>
			<h3
				id='font-heading'
				className='mb-3 text-[0.98rem] font-medium text-stone-800'
			>
				Font
			</h3>
			<div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
				{FONT_OPTIONS.map((fontOption) => {
					const isSelected = font === fontOption;
					return (
						<button
							key={fontOption}
							type='button'
							aria-pressed={isSelected}
							onClick={() => setFont(fontOption)}
							className={`flex min-h-[4.75rem] items-center justify-between gap-3 rounded-[1.1rem] px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
								isSelected
									? 'bg-[#e3e4e9] text-stone-900'
									: 'bg-[#f8f8fa] text-stone-700 hover:bg-stone-100'
							}`}
						>
							<span className='min-w-0'>
								<span className='block truncate text-[0.98rem]'>
									{fontOption}
								</span>
								<span className='mt-0.5 block truncate text-sm text-stone-500'>
									Ask Ostra anything
								</span>
							</span>
							<span
								aria-hidden='true'
								className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
									isSelected
										? 'border-emerald-600 bg-emerald-600 text-white'
										: 'border-stone-300 bg-transparent'
								}`}
							>
								{isSelected && <Check size={16} strokeWidth={2.2} />}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	</div>
);

const SectionOverview = ({ section }: { section: SettingsSection }) => {
	const Icon = section.Icon;
	return (
		<section className='rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:p-6'>
			<div className='flex items-start gap-4'>
				<span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-stone-600 shadow-sm'>
					<Icon size={21} strokeWidth={1.8} aria-hidden='true' />
				</span>
				<div>
					<h2 className='font-medium text-stone-900'>{section.label}</h2>
					<p className='mt-1 text-sm leading-6 text-stone-500'>
						{section.overview}
					</p>
				</div>
			</div>
		</section>
	);
};

export default SettingsPanel;
