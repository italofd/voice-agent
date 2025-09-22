import { ConnectionStatus } from "./types";

interface VoiceBotHeaderProps {
	status: ConnectionStatus;
	showTechnicalLogs: boolean;
	setShowTechnicalLogs: (show: boolean) => void;
	isConnecting: boolean;
	canConnect: boolean;
	canDisconnect: boolean;
	connect: () => void;
	disconnect: () => void;
}

export default function VoiceBotHeader({
	status,
	showTechnicalLogs,
	setShowTechnicalLogs,
	isConnecting,
	canConnect,
	canDisconnect,
	connect,
	disconnect,
}: VoiceBotHeaderProps) {
	return (
		<div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-800/20 shadow-2xl p-8 mb-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-6">
					<div className="flex items-center space-x-4">
						<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
							<span className="text-white text-xl font-bold">🤖</span>
						</div>
						<div>
							<h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
								Voice Agent
							</h1>
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
								AI-powered conversation assistant
							</p>
						</div>
					</div>
					<span
						className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
							status === "connected"
								? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
								: status === "connecting"
								? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
								: status === "error"
								? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
								: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
						}`}
					>
						{status === "connected"
							? "Connected"
							: status === "connecting"
							? "Connecting..."
							: status === "error"
							? "Connection Error"
							: "Disconnected"}
					</span>
				</div>

				<div className="flex items-center space-x-4">
					{/* Technical Logs Toggle */}
					<div className="relative group">
						<button
							onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
							className={`p-3 rounded-xl transition-all duration-200 ${
								showTechnicalLogs
									? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
									: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
							}`}
							title="Toggle Technical Logs"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</button>
						<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							<div className="bg-black text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
								Technical Logs
							</div>
						</div>
					</div>

					<div className="flex space-x-3">
						<button
							onClick={connect}
							disabled={!canConnect}
							className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl ${
								canConnect
									? `bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-500/30 ${
											!isConnecting ? "animate-pulse" : ""
									  }`
									: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
							}`}
						>
							{isConnecting ? (
								<div className="flex items-center space-x-2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>Connecting...</span>
								</div>
							) : status === "error" ? (
								"Try Again"
							) : (
								"Connect"
							)}
						</button>

						<button
							onClick={disconnect}
							disabled={!canDisconnect}
							className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl ${
								canDisconnect
									? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-4 focus:ring-red-500/30"
									: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
							}`}
						>
							Disconnect
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
