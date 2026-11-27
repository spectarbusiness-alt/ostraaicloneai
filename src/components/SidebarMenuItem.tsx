import { LucideIcon } from 'lucide-react';

type SidebarMenuItemProps = {
	Icon: LucideIcon;
	label: string;
	isExpanded?: boolean;
};

const SidebarMenuItem = ({ Icon, label, isExpanded }: SidebarMenuItemProps) => {
	return (
		<div
			className={`flex min-h-11 items-center justify-start gap-2 rounded-full px-[0.875rem] text-sm text-gray-600 ${
				isExpanded ? 'w-full' : 'w-11'
			}`}
		>
			<Icon className='min-w-4' size={16} aria-hidden='true' />
			<p className='line-clamp-1'>{label}</p>
		</div>
	);
};

export default SidebarMenuItem;
