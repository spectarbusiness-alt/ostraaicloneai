import { MessageSquare } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type RecentChatItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	label: string;
};

const RecentChatItem = ({
	label,
	className,
	...props
}: RecentChatItemProps) => {
	return (
		<button
			type='button'
			className={`flex min-h-11 w-full items-center justify-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-600 duration-300 hover:bg-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${className ?? ''}`}
			{...props}
		>
			<MessageSquare className='shrink-0' size={16} />
			<span className='line-clamp-1'>{label}</span>
		</button>
	);
};

export default RecentChatItem;
