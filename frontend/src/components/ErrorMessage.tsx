export default function ErrorMessage() {
	return (
		<div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6 shadow-lg">
			<div className="flex items-center space-x-3">
				<div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
					<span className="text-white text-sm">⚠️</span>
				</div>
				<div className="flex-1">
					<div className="text-red-800 dark:text-red-200 font-bold text-lg">
						Connection Failed
					</div>
					<div className="text-red-700 dark:text-red-300 mt-1">
						Unable to connect to the voice server. Make sure the server is
						running on port 7860.
					</div>
				</div>
			</div>
		</div>
	);
}
