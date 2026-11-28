import { LucideIcon } from 'lucide-react';

type SidebarMenuItemProps = {
	Icon: LucideIcon;
	label: string;
	isExpanded?: boolean;
	isActive?: boolean;
	controls?: string;
	onClick?: () => void;
};

const SidebarMenuItem = ({
	Icon,
	label,
	isExpanded = true,
	isActive = false,
	controls,
	onClick,
}: SidebarMenuItemProps) => {
	const className = `flex min-h-11 items-center justify-start gap-2 rounded-full px-[0.875rem] text-sm text-gray-600 transition-colors duration-200 ${
		isExpanded ? 'w-full' : 'w-11'
	} ${isActive ? 'bg-white text-brand-300 shadow-sm' : 'hover:bg-brand-200'}`;

	const content = (
		<>
			<Icon className='min-w-4' size={16} aria-hidden='true' />
			<p className='line-clamp-1'>{label}</p>
		</>
	);

	if (onClick) {
		return (
			<button
				type='button'
				className={className}
				onClick={onClick}
				aria-expanded={isActive}
				aria-controls={controls}
			>
				{content}
			</button>
		);
	}

	return <div className={className}>{content}</div>;
};

export default SidebarMenuItem;
