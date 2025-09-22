import { ConnectionStatus } from "./types";

interface TechnicalLogsSectionProps {
	status: ConnectionStatus;
	debugLogs: string[];
	debugLogRef: React.RefObject<HTMLDivElement | null>;
}

export default function TechnicalLogsSection({
	status,
	debugLogs,
	debugLogRef,
}: TechnicalLogsSectionProps) {
	return (
		<div
			className={`w-96 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border-2 shadow-2xl flex flex-col min-h-0 ${
				status === "connected"
					? "border-green-300 dark:border-green-700"
					: status === "error"
					? "border-red-300 dark:border-red-700"
					: "border-gray-200 dark:border-gray-700"
			}`}
		>
			<div className="border-b border-gray-200/50 dark:border-gray-700/50 p-6 flex-shrink-0">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
					<svg
						className="w-5 h-5 mr-2"
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
					Technical Logs
				</h2>
			</div>

			<div className="flex-1 p-6 min-h-0">
				<div
					ref={debugLogRef}
					className="h-full overflow-y-auto scrollbar-thin bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border p-4 text-sm font-mono space-y-2"
				>
					{debugLogs.length === 0 ? (
						<div className="text-gray-500 dark:text-gray-400 text-center py-8">
							No technical logs yet...
						</div>
					) : (
						debugLogs.map((log, index) => (
							<div
								key={index}
								className={`p-2 rounded-lg ${
									log.includes("Error")
										? "text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-900/20"
										: "text-gray-600 dark:text-gray-400"
								}`}
							>
								{log}
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
