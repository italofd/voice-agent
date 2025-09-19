import PipecatRoot from "@/components";

export default function Home() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<div className="container mx-auto py-8 px-4">
				<header className="text-center mb-8">
					<h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
						AI Voice Agent
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-400">
						Connect and chat with your AI assistant using WebSocket transport
					</p>
				</header>
				<main>
					<PipecatRoot />
				</main>
			</div>
		</div>
	);
}
