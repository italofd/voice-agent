"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
	PipecatClientProvider,
	PipecatClientAudio,
} from "@pipecat-ai/client-react";
import { WebSocketTransport } from "@pipecat-ai/websocket-transport";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export default function Pipecat() {
	return (
		<div className="container max-w-4xl mx-auto p-6">
			<VoiceBot />
		</div>
	);
}

function VoiceBot() {
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");
	const [isConnecting, setIsConnecting] = useState(false);
	const [debugLogs, setDebugLogs] = useState<string[]>([]);
	const [client, setClient] = useState<PipecatClient | null>(null);
	const debugLogRef = useRef<HTMLDivElement>(null);
	const clientRef = useRef<PipecatClient | null>(null);

	// Logging function
	const log = useCallback((message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		const logEntry = `${timestamp} - ${message}`;
		console.log(logEntry);
		setDebugLogs((prev) => [...prev.slice(-49), logEntry]);
	}, []);

	// Auto-scroll debug log to bottom
	useEffect(() => {
		if (debugLogRef.current) {
			debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight;
		}
	}, [debugLogs]);

	// Initialize client with proper callbacks
	const initializeClient = useCallback(() => {
		if (clientRef.current) {
			return clientRef.current;
		}

		const newClient = new PipecatClient({
			transport: new WebSocketTransport(),
			enableMic: true,
			enableCam: false,
			callbacks: {
				onConnected: () => {
					console.log("✅ Connected to bot");
					setStatus("connected");
					setIsConnecting(false);
					log("Connected to voice bot");
				},
				onDisconnected: () => {
					console.log("❌ Disconnected from bot");
					setStatus("disconnected");
					setIsConnecting(false);
					log("Disconnected from voice bot");
					// Clear the client reference on disconnect
					clientRef.current = null;
					setClient(null);
				},
				onBotReady: (data) => {
					console.log("🤖 Bot ready:", data);
					log("Bot is ready to chat");
				},
				onUserTranscript: (data) => {
					if (data.final) {
						console.log("👤 User:", data.text);
						log(`User: ${data.text}`);
					}
				},
				onBotTranscript: (data) => {
					console.log("🤖 Bot:", data.text);
					log(`Bot: ${data.text}`);
				},
				onMessageError: (error) => {
					console.error("💥 Message error:", error);
					log(`Message error: ${JSON.stringify(error)}`);
					setStatus("error");
					setIsConnecting(false);
				},
				onError: (error) => {
					console.error("💥 Connection error:", error);
					log(`Connection error: ${JSON.stringify(error)}`);
					setStatus("error");
					setIsConnecting(false);
					// Clear client on error to allow reconnection
					clientRef.current = null;
					setClient(null);
				},
			},
		});

		clientRef.current = newClient;
		setClient(newClient);
		return newClient;
	}, [log]);

	// Connect function
	const connect = useCallback(async () => {
		if (isConnecting) return;

		setIsConnecting(true);
		setStatus("connecting");
		log("Attempting to connect...");

		try {
			const clientInstance = initializeClient();

			log("Initializing audio devices...");
			await clientInstance.initDevices();

			log("Connecting to voice bot...");
			const wsUrl =
				process.env.NEXT_PUBLIC_PIPECAT_WS_URL || "ws://localhost:7860";

			await clientInstance.connect({
				wsUrl: `${wsUrl}/ws`,
			});

			log("Connection successful!");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("Connection failed:", errorMessage);
			log(`Connection failed: ${errorMessage}`);
			setStatus("error");
			setIsConnecting(false);
			// Clear client on connection failure
			clientRef.current = null;
			setClient(null);
		}
	}, [isConnecting, initializeClient, log]);

	// Disconnect function
	const disconnect = useCallback(async () => {
		if (!clientRef.current) return;

		try {
			log("Disconnecting...");
			await clientRef.current.disconnect();
			log("Disconnected successfully");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("Disconnect error:", errorMessage);
			log(`Disconnect error: ${errorMessage}`);
		} finally {
			// Always clear state regardless of success or failure
			setStatus("disconnected");
			setIsConnecting(false);
			clientRef.current = null;
			setClient(null);
		}
	}, [log]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (clientRef.current) {
				clientRef.current.disconnect().catch(console.error);
			}
		};
	}, []);

	// Status indicators
	const isConnected = status === "connected";
	const canConnect =
		(status === "disconnected" || status === "error") && !isConnecting;
	const canDisconnect = isConnected;

	const getStatusColor = () => {
		switch (status) {
			case "connected":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
			case "connecting":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
			case "error":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
			default:
				return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
		}
	};

	const getStatusText = () => {
		switch (status) {
			case "connected":
				return "Connected";
			case "connecting":
				return "Connecting...";
			case "error":
				return "Connection Error";
			default:
				return "Disconnected";
		}
	};

	return (
		<div className="space-y-6">
			{/* Status Header */}
			<div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Voice Agent
						</h1>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
						>
							{getStatusText()}
						</span>
					</div>

					<div className="flex space-x-3">
						<button
							onClick={connect}
							disabled={!canConnect}
							className={`px-6 py-2 rounded-lg font-medium transition-colors ${
								canConnect
									? "bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
									: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
							}`}
						>
							{isConnecting
								? "Connecting..."
								: status === "error"
								? "Try Again"
								: "Connect"}
						</button>

						<button
							onClick={disconnect}
							disabled={!canDisconnect}
							className={`px-6 py-2 rounded-lg font-medium transition-colors ${
								canDisconnect
									? "bg-red-500 text-white hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
									: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
							}`}
						>
							Disconnect
						</button>
					</div>
				</div>
			</div>

			{/* Connection Instructions */}
			{status === "disconnected" && (
				<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
					<div className="flex items-center space-x-2">
						<span className="text-blue-600 dark:text-blue-400">ℹ️</span>
						<span className="text-blue-800 dark:text-blue-200 font-medium">
							Click "Connect" to start talking with the voice agent
						</span>
					</div>
				</div>
			)}

			{/* Error Message */}
			{status === "error" && (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<div className="flex items-center space-x-2">
						<span className="text-red-600 dark:text-red-400">⚠️</span>
						<div className="flex-1">
							<div className="text-red-800 dark:text-red-200 font-medium">
								Connection Failed
							</div>
							<div className="text-red-700 dark:text-red-300 text-sm mt-1">
								Unable to connect to the voice server. Make sure the server is
								running on port 7860.
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Conversation Log */}
			<div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="border-b border-gray-200 dark:border-gray-700 p-4">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
						Conversation Log
					</h2>
				</div>

				<div className="p-4">
					<div
						ref={debugLogRef}
						className="bg-gray-50 dark:bg-gray-800 rounded-lg border p-4 h-80 overflow-y-auto text-sm font-mono space-y-1"
					>
						{debugLogs.length === 0 ? (
							<div className="text-gray-500 dark:text-gray-400 text-center py-8">
								No conversation yet... Connect and start talking!
							</div>
						) : (
							debugLogs.map((log, index) => (
								<div
									key={index}
									className={`${
										log.includes("User:")
											? "text-blue-600 dark:text-blue-400 font-medium"
											: log.includes("Bot:")
											? "text-green-600 dark:text-green-400 font-medium"
											: log.includes("Error")
											? "text-red-600 dark:text-red-400"
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

			{/* Audio Component - Only render when connected */}
			{client && isConnected && (
				<PipecatClientProvider client={client}>
					<PipecatClientAudio />
				</PipecatClientProvider>
			)}
		</div>
	);
}
