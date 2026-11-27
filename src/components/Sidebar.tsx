import { CircleHelp, History, Menu, Plus, Settings, X } from 'lucide-react';
import { useContext, useState } from 'react';

import { ChatContext } from '@/providers/ChatContext';

import RecentChatItem from './RecentChatItem';
import SettingsPanel from './SettingsPanel';
import SidebarMenuItem from './SidebarMenuItem';

type SidebarProps = {
	isMobileOpen: boolean;
	onClose: () => void;
};

const Sidebar = ({ isMobileOpen, onClose }: SidebarProps) => {
	const { openConversation, startNewChat, recentChats, isGenerating } =
		useContext(ChatContext);
	const [isExpanded, setIsExpanded] = useState(true);
	const [isDesktopSettingsOpen, setIsDesktopSettingsOpen] = useState(false);
	const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

	const handleDesktopSettingsClick = () => {
		setIsExpanded(true);
		setIsDesktopSettingsOpen((open) => !open);
	};

	const handleMobileSettingsClick = () => {
		setIsMobileSettingsOpen((open) => !open);
	};

	const closeMobileMenu = () => {
		setIsMobileSettingsOpen(false);
		onClose();
	};

	const handleNewChat = () => {
		if (isGenerating) return;
		startNewChat();
		closeMobileMenu();
	};

	const recentItems = recentChats
		.slice()
		.reverse()
		.map(({ id, title }) => (
			<RecentChatItem
				key={id}
				onClick={
					!isGenerating
						? () => {
								openConversation(id);
								closeMobileMenu();
							}
						: undefined
				}
				label={title}
			/>
		));

	return (
		<>
			<aside
				aria-label='Main navigation'
				className={`hidden h-dvh max-w-60 flex-col justify-between bg-brand-100 px-4 py-6 duration-300 sm:relative sm:flex ${
					isExpanded ? 'w-60' : 'w-[4.75rem]'
				}`}
			>
				<div>
					<button
						type='button'
						onClick={() => setIsExpanded((expanded) => !expanded)}
						aria-label={
							isExpanded ? 'Collapse navigation' : 'Expand navigation'
						}
						aria-expanded={isExpanded}
						className='grid h-11 w-11 place-items-center rounded-full hover:bg-brand-200'
					>
						<Menu size={18} />
					</button>
					<button
						type='button'
						onClick={handleNewChat}
						disabled={isGenerating}
						className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-200 px-3.5 text-sm text-brand-300 duration-300 disabled:opacity-50 ${
							isExpanded ? 'w-full' : 'w-11 justify-center px-0'
						}`}
					>
						<Plus className='shrink-0' size={18} />
						{isExpanded && <span className='truncate'>New Chat</span>}
					</button>

					{isExpanded && (
						<nav className='mt-5 flex min-h-0 flex-col'>
							<p className='my-3 ml-2 text-sm font-medium text-brand-300'>
								Recent
							</p>
							<div className='no-scrollbar max-h-[55vh] overflow-y-auto'>
								{recentItems}
							</div>
						</nav>
					)}
				</div>

				<div className='flex flex-col gap-1'>
					{[
						{ label: 'Activity', icon: History },
						{ label: 'Help', icon: CircleHelp },
						{ label: 'Settings', icon: Settings },
					].map(({ label, icon: Icon }) => (
						<SidebarMenuItem
							key={label}
							Icon={Icon}
							label={label}
							isExpanded={isExpanded}
							isActive={label === 'Settings' && isDesktopSettingsOpen}
							controls={
								label === 'Settings' ? 'desktop-settings-panel' : undefined
							}
							onClick={
								label === 'Settings' ? handleDesktopSettingsClick : undefined
							}
						/>
					))}
				</div>
				{isDesktopSettingsOpen && (
					<SettingsPanel
						id='desktop-settings-panel'
						isAdjacent
						onClose={() => setIsDesktopSettingsOpen(false)}
					/>
				)}
			</aside>

			{isMobileOpen && (
				<div className='fixed inset-0 z-50 sm:hidden'>
					<button
						type='button'
						aria-label='Close navigation menu'
						onClick={closeMobileMenu}
						className='absolute inset-0 h-full w-full bg-black/35'
					/>
					<aside
						role='dialog'
						aria-modal='true'
						aria-label='Main navigation'
						onKeyDown={(event) => event.key === 'Escape' && closeMobileMenu()}
						className='absolute inset-y-0 left-0 flex w-[min(84vw,20rem)] flex-col bg-brand-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl'
					>
						<div className='flex items-center justify-between border-b border-brand-200 pb-4'>
							<span className='text-lg font-medium text-brand-300'>Ostra</span>
							<button
								type='button'
								aria-label='Close navigation menu'
								onClick={closeMobileMenu}
								className='grid h-11 w-11 place-items-center rounded-full hover:bg-brand-200'
							>
								<X size={20} />
							</button>
						</div>
						<button
							type='button'
							onClick={handleNewChat}
							disabled={isGenerating}
							className='mt-4 flex min-h-12 items-center gap-3 rounded-2xl bg-brand-200 px-4 text-left text-brand-300 disabled:opacity-50'
						>
							<Plus size={20} />
							<span>New Chat</span>
						</button>
						<nav className='mt-5 min-h-0 flex-1 overflow-y-auto'>
							<p className='mb-2 px-2 text-sm font-medium text-brand-300'>
								Recent
							</p>
							{recentItems}
						</nav>
						<div className='border-t border-brand-200 pt-3'>
							{[
								{ label: 'Activity', icon: History },
								{ label: 'Help', icon: CircleHelp },
								{ label: 'Settings', icon: Settings },
							].map(({ label, icon: Icon }) => (
								<SidebarMenuItem
									key={label}
									Icon={Icon}
									label={label}
									isActive={label === 'Settings' && isMobileSettingsOpen}
									controls={
										label === 'Settings' ? 'mobile-settings-panel' : undefined
									}
									onClick={
										label === 'Settings' ? handleMobileSettingsClick : undefined
									}
								/>
							))}
						</div>
						{isMobileSettingsOpen && (
							<SettingsPanel
								id='mobile-settings-panel'
								onClose={() => setIsMobileSettingsOpen(false)}
							/>
						)}
					</aside>
				</div>
			)}
		</>
	);
};

export default Sidebar;
