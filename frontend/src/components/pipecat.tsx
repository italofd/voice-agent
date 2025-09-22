"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
	PipecatClientProvider,
	PipecatClientAudio,
} from "@pipecat-ai/client-react";
import { WebSocketTransport } from "@pipecat-ai/websocket-transport";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type ConversationMessage = {
	id: string;
	type: "user" | "bot";
	text: string;
	timestamp: Date;
	isTyping?: boolean;
};

export default function Pipecat() {
	return (
		<div className="h-full w-full ">
			<VoiceBot />
		</div>
	);
}

function VoiceBot() {
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");
	const [isConnecting, setIsConnecting] = useState(false);
	const [debugLogs, setDebugLogs] = useState<string[]>([]);
	const [conversationMessages, setConversationMessages] = useState<
		ConversationMessage[]
	>([]);
	const [client, setClient] = useState<PipecatClient | null>(null);
	const [isListening, setIsListening] = useState(false);
	const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
	const debugLogRef = useRef<HTMLDivElement>(null);
	const conversationRef = useRef<HTMLDivElement>(null);
	const clientRef = useRef<PipecatClient | null>(null);

	// Logging function for technical logs
	const log = useCallback((message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		const logEntry = `${timestamp} - ${message}`;
		console.log(logEntry);
		setDebugLogs((prev) => [...prev.slice(-49), logEntry]);
	}, []);

	// Add conversation message
	const addConversationMessage = useCallback(
		(type: "user" | "bot", text: string) => {
			const message: ConversationMessage = {
				id: Date.now().toString(),
				type,
				text,
				timestamp: new Date(),
			};
			setConversationMessages((prev) => [...prev, message]);
		},
		[]
	);

	// Auto-scroll both logs to bottom
	useEffect(() => {
		if (debugLogRef.current) {
			debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight;
		}
	}, [debugLogs]);

	useEffect(() => {
		if (conversationRef.current) {
			conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
		}
	}, [conversationMessages]);

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
					setIsListening(false);
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
						addConversationMessage("user", data.text);
						setIsListening(false);
					} else {
						// User is still speaking
						setIsListening(true);
					}
				},
				onBotTranscript: (data) => {
					console.log("🤖 Bot:", data.text);
					addConversationMessage("bot", data.text);
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
					setIsListening(false);
					// Clear client on error to allow reconnection
					clientRef.current = null;
					setClient(null);
				},
			},
		});

		clientRef.current = newClient;
		setClient(newClient);
		return newClient;
	}, [log, addConversationMessage]);

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
			setIsListening(false);
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

	const getTechnicalLogsBorderColor = () => {
		switch (status) {
			case "connected":
				return "border-green-300 dark:border-green-700";
			case "error":
				return "border-red-300 dark:border-red-700";
			default:
				return "border-gray-200 dark:border-gray-700";
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
		<div className="h-full flex flex-col max-h-screen overflow-hidden">
			<div className="flex-shrink-0 px-6 pt-6">
				{/* Bold Header */}
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
								className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${getStatusColor()}`}
							>
								{getStatusText()}
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

				{/* Error Message */}
				{status === "error" && (
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
				)}
			</div>

			{/* Two-Column Layout */}
			<div className="flex-1 flex gap-6 px-6 pb-6 min-h-0">
				{/* Main Conversation - Left Column */}
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

				{/* Technical Logs - Right Column */}
				{showTechnicalLogs && (
					<div
						className={`w-96 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border-2 shadow-2xl flex flex-col min-h-0 ${getTechnicalLogsBorderColor()}`}
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
				)}
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
