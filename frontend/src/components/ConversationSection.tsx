import { ConversationMessage } from "./types";

interface ConversationSectionProps {
	isConnected: boolean;
	isListening: boolean;
	conversationMessages: ConversationMessage[];
	conversationRef: React.RefObject<HTMLDivElement | null>;
}

export default function ConversationSection({
	isConnected,
	isListening,
	conversationMessages,
	conversationRef,
}: ConversationSectionProps) {
	return (
		<div className="flex-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-800/20 shadow-2xl flex flex-col min-h-0">
			<div className="border-b border-gray-200/50 dark:border-gray-700/50 p-6">
				<h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					💬 Conversation
				</h2>
				{isConnected && (
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
						Start speaking - your voice agent is listening!
					</p>
				)}
			</div>

			{/* Audio Visualizer */}
			{isConnected && (
				<div className="border-b border-gray-200/50 dark:border-gray-700/50 p-6">
					<div className="flex items-center justify-center relative"></div>
					{isListening && (
						<div className="text-center mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
							🎤 Listening...
						</div>
					)}
				</div>
			)}

			<div className="flex-1 p-6 min-h-0">
				<div
					ref={conversationRef}
					className="h-full overflow-y-auto space-y-4 scrollbar-thin"
				>
					{conversationMessages.length === 0 ? (
						<div className="text-center py-20">
							<div className="text-6xl mb-4">💬</div>
							<div className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">
								No conversation yet...
							</div>
							<div className="text-sm text-gray-400 dark:text-gray-500">
								{isConnected
									? "Start talking with your AI assistant!"
									: "Connect to start chatting"}
							</div>
						</div>
					) : (
						conversationMessages.map((message) => (
							<div
								key={message.id}
								className={`flex ${
									message.type === "user" ? "justify-end" : "justify-start"
								}`}
							>
								<div
									className={`max-w-xs lg:max-w-md px-6 py-3 rounded-3xl shadow-lg ${
										message.type === "user"
											? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
											: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white"
									}`}
								>
									<div className="text-sm font-medium">{message.text}</div>
									<div
										className={`text-xs mt-2 ${
											message.type === "user"
												? "text-blue-100"
												: "text-gray-500 dark:text-gray-400"
										}`}
									>
										{message.timestamp.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
