import {
	ArrowUpRight,
	BookOpen,
	ChevronDown,
	Code2,
	Crown,
	Gift,
	LogOut,
	Settings,
	Tag,
	ToggleLeft,
	X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SettingsPanelProps = {
	id: string;
	onClose: () => void;
	isAdjacent?: boolean;
};

const SettingsPanel = ({
	id,
	onClose,
	isAdjacent = false,
}: SettingsPanelProps) => {
	return (
		<section
			id={id}
			aria-label='Account and settings menu'
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.stopPropagation();
					onClose();
				}
			}}
			className={`sidebar-settings-enter absolute z-30 flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-stone-200 bg-[#f5f4f1] p-2.5 shadow-xl ${
				isAdjacent
					? 'left-[calc(100%+0.75rem)] top-2 w-80'
					: 'inset-x-2 bottom-2'
			}`}
			style={{
				height: isAdjacent
					? 'min(36rem, calc(100dvh - 1rem))'
					: 'min(36rem, calc(100% - 1rem))',
			}}
		>
			<header className='flex h-7 shrink-0 justify-end'>
				<button
					type='button'
					onClick={onClose}
					aria-label='Close settings menu'
					className='grid h-7 w-7 place-items-center rounded-full text-stone-500 transition-colors hover:bg-white hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600'
				>
					<X size={15} />
				</button>
			</header>

			<div className='no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[1.1rem] border border-stone-200/80 bg-white/45 p-2.5'>
				<div className='shrink-0 overflow-hidden rounded-[1.15rem] border border-stone-100 bg-white shadow-sm'>
					<div className='px-3 pb-3 pt-3.5'>
						<div className='flex items-center justify-center gap-2 text-stone-900'>
							<Tag size={17} strokeWidth={1.8} aria-hidden='true' />
							<h2 className='text-[1.05rem] font-medium'>Free Plan</h2>
						</div>
						<p className='mt-2.5 text-center text-sm text-stone-600'>
							8 out of 10 messages used
						</p>
						<div
							role='progressbar'
							aria-label='Free plan messages used'
							aria-valuemin={0}
							aria-valuemax={10}
							aria-valuenow={8}
							className='mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200'
						>
							<div className='h-full w-4/5 rounded-full bg-yellow-400' />
						</div>
					</div>
					<div className='flex h-12 shrink-0 items-center justify-center gap-2 bg-stone-900 text-sm font-medium text-white'>
						<Crown size={17} strokeWidth={1.8} aria-hidden='true' />
						<span>Upgrade Now</span>
					</div>
				</div>

				<div className='mt-2 shrink-0 space-y-0.5'>
					<MenuRow Icon={Settings} label='Settings' />
					<MenuRow Icon={ToggleLeft} label='AI Preferences' />
					<MenuRow Icon={Gift} label='Refer & Earn' />
				</div>

				<div className='my-1 shrink-0 border-t border-stone-200' />

				<div className='shrink-0 space-y-0.5'>
					<MenuRow Icon={BookOpen} label='How to use AI Fiesta' />
					<MenuRow Icon={Code2} label='PromptBook' />
					<div className='flex min-h-9 items-center gap-3 rounded-xl px-2.5 text-[0.84rem] text-stone-700'>
						<span className='grid h-5 w-5 shrink-0 place-items-center text-violet-600'>
							<Code2 size={17} strokeWidth={1.8} aria-hidden='true' />
						</span>
						<span className='min-w-0 flex-1 truncate'>
							Get AI APIs with Mesh
						</span>
						<ArrowUpRight
							size={14}
							className='shrink-0 text-stone-500'
							aria-hidden='true'
						/>
					</div>
				</div>

				<div className='my-1 shrink-0 border-t border-stone-200' />

				<div className='flex min-h-9 shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm text-rose-500'>
					<LogOut size={17} strokeWidth={1.8} aria-hidden='true' />
					<span>Logout</span>
				</div>
			</div>

			<footer className='mt-2 flex shrink-0 items-center gap-3 px-1.5 pb-0.5 pt-1'>
				<div className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-semibold text-white'>
					S
				</div>
				<div className='min-w-0 flex-1'>
					<p className='truncate text-sm font-medium text-stone-900'>Spectar</p>
					<p className='text-xs text-stone-500'>Free</p>
				</div>
				<ChevronDown size={18} className='text-stone-500' aria-hidden='true' />
			</footer>
		</section>
	);
};

type MenuRowProps = {
	Icon: LucideIcon;
	label: string;
};

const MenuRow = ({ Icon, label }: MenuRowProps) => (
	<div className='flex min-h-9 items-center gap-3 rounded-xl px-2.5 text-[0.88rem] text-stone-800'>
		<Icon
			size={17}
			strokeWidth={1.7}
			className='shrink-0 text-stone-500'
			aria-hidden='true'
		/>
		<span className='truncate'>{label}</span>
	</div>
);

export default SettingsPanel;
