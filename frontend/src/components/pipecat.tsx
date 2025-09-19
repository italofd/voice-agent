"use client";

import { useState, useRef, useEffect } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
	PipecatClientProvider,
	PipecatClientAudio,
	usePipecatClient,
} from "@pipecat-ai/client-react";
import { WebSocketTransport } from "@pipecat-ai/websocket-transport";

// Create the client instance with WebSocket transport
const client = new PipecatClient({
	transport: new WebSocketTransport(),
	enableMic: true,
	enableCam: false,
	callbacks: {
		onConnected: () => {
			console.log("Connected to bot");
		},
		onDisconnected: () => {
			console.log("Disconnected from bot");
		},
		onBotReady: (data) => {
			console.log("Bot ready:", data);
		},
		onUserTranscript: (data) => {
			console.log("User transcript:", data);
			if (data.final) {
				console.log("User:", data.text);
			}
		},
		onBotTranscript: (data) => {
			console.log("Bot:", data.text);
		},
		onMessageError: (error) => {
			console.error("Message error:", error);
		},
		onError: (error) => {
			console.error("Error:", error);
		},
	},
});

export default function Pipecat() {
	return (
		<div className="container max-w-4xl mx-auto p-6">
			<PipecatClientProvider client={client}>
				<VoiceBot />
				<PipecatClientAudio />
			</PipecatClientProvider>
		</div>
	);
}

// Component using the client
function VoiceBot() {
	const client = usePipecatClient();
	const [status, setStatus] = useState("Disconnected");
	const [isConnecting, setIsConnecting] = useState(false);
	const [debugLogs, setDebugLogs] = useState<string[]>([]);
	const debugLogRef = useRef<HTMLDivElement>(null);

	const log = (message: string) => {
		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp} - ${message}`;
		console.log(logEntry);
		setDebugLogs((prev) => [...prev.slice(-49), logEntry]); // Keep last 50 logs
	};

	// Auto-scroll debug log to bottom
	useEffect(() => {
		if (debugLogRef.current) {
			debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight;
		}
	}, [debugLogs]);

	const connect = async () => {
		if (!client) {
			console.error("Client not found");
			return;
		}

		setIsConnecting(true);
		setStatus("Connecting...");
		log("Attempting to connect...");

		try {
			const startTime = Date.now();

			log("Initializing devices...");
			await client.initDevices();

			log("Connecting to bot...");
			await client.connect({
				wsUrl: `${
					process.env.NEXT_PUBLIC_PIPECAT_WS_URL || "ws://localhost:7860"
				}/ws`,
			});

			const timeTaken = Date.now() - startTime;
			setStatus("Connected");
			log(`Connection complete, timeTaken: ${timeTaken}ms`);
		} catch (error) {
			const errorMessage = (error as Error).message;
			log(`Error connecting: ${errorMessage}`);
			setStatus("Error");
		} finally {
			setIsConnecting(false);
		}
	};

	const disconnect = async () => {
		if (!client) return;

		try {
			setStatus("Disconnecting...");
			log("Disconnecting...");
			await client.disconnect();
			setStatus("Disconnected");
			log("Disconnected successfully");
		} catch (error) {
			const errorMessage = (error as Error).message;
			log(`Error disconnecting: ${errorMessage}`);
		}
	};

	const isConnected = status === "Connected";
	const canConnect = status === "Disconnected" && !isConnecting;
	const canDisconnect = isConnected;

	return (
		<div className="space-y-6">
			{/* Status Bar */}
			<div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex justify-between items-center">
				<div className="flex items-center space-x-2">
					<span className="text-sm font-medium">Transport:</span>
					<span
						className={`px-2 py-1 rounded text-sm font-medium ${
							status === "Connected"
								? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
								: status === "Error"
								? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
								: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
						}`}
					>
						{status}
					</span>
				</div>
				<div className="flex space-x-2">
					<button
						onClick={connect}
						disabled={!canConnect}
						className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
							canConnect
								? "bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
								: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
						}`}
					>
						{isConnecting ? "Connecting..." : "Connect"}
					</button>
					<button
						onClick={disconnect}
						disabled={!canDisconnect}
						className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
							canDisconnect
								? "bg-red-500 text-white hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
								: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
						}`}
					>
						Disconnect
					</button>
				</div>
			</div>

			{/* Debug Panel */}
			<div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
				<h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
					Debug Info
				</h3>
				<div
					ref={debugLogRef}
					className="bg-gray-50 dark:bg-gray-800 rounded border p-3 h-64 overflow-y-auto text-sm font-mono"
				>
					{debugLogs.length === 0 ? (
						<div className="text-gray-500 dark:text-gray-400">
							No logs yet...
						</div>
					) : (
						debugLogs.map((log, index) => (
							<div
								key={index}
								className={`mb-1 ${
									log.includes("User:")
										? "text-blue-600 dark:text-blue-400"
										: log.includes("Bot:")
										? "text-green-600 dark:text-green-400"
										: log.includes("Error")
										? "text-red-600 dark:text-red-400"
										: "text-gray-700 dark:text-gray-300"
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
