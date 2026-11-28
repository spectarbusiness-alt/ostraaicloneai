import { useState } from 'react';

import Main from '@/components/Main';
import Sidebar from '@/components/Sidebar';

const App = () => {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<>
			<Sidebar
				isMobileOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
			/>
			<Main onOpenSidebar={() => setIsMobileMenuOpen(true)} />
		</>
	);
};

export default App;
