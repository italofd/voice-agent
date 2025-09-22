"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
	PipecatClientProvider,
	PipecatClientAudio,
} from "@pipecat-ai/client-react";
import { WebSocketTransport } from "@pipecat-ai/websocket-transport";
import {
	ConnectionStatus,
	ConversationMessage,
	MetricsEvent,
	RtviMetricsData,
} from "./types";
import VoiceBotHeader from "./VoiceBotHeader";
import ErrorMessage from "./ErrorMessage";
import ConversationSection from "./ConversationSection";
import TechnicalLogsSection from "./TechnicalLogsSection";
import MetricsSection from "./MetricsSection";

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
	const [showMetrics, setShowMetrics] = useState(false);
	const debugLogRef = useRef<HTMLDivElement>(null);
	const conversationRef = useRef<HTMLDivElement>(null);
	const clientRef = useRef<PipecatClient | null>(null);
	const metricsRef = useRef<HTMLDivElement>(null);
	const [metricsEvents, setMetricsEvents] = useState<MetricsEvent[]>([]);

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

	useEffect(() => {
		if (metricsRef.current) {
			metricsRef.current.scrollTop = metricsRef.current.scrollHeight;
		}
	}, [metricsEvents]);

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
					setMetricsEvents([]);
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
						console.log("👤 User (STT):", data.text);
						log(`User said: ${data.text}`);
						addConversationMessage("user", data.text);
						setIsListening(false);
					} else {
						// User is still speaking
						setIsListening(true);
					}
				},
				onBotTranscript: (data) => {
					console.log("🤖 Bot (TTS):", data);
					log(`Bot responded: ${data.text}`);
					addConversationMessage("bot", data.text);
				},
				onBotLlmText: (data) => {
					console.log("🤖 Bot (LLM):", data);
					log(`LLM: ${typeof data === "string" ? data : JSON.stringify(data)}`);
				},
				onBotTtsText: (data) => {
					console.log("🤖 Bot (TTS):", data);
					log(`TTS: ${typeof data === "string" ? data : JSON.stringify(data)}`);
				},
				onMetrics: (data) => {
					console.log("🤖 Bot (Metrics):", data);
					const evt: MetricsEvent = {
						id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						timestamp: new Date(),
						data: data as RtviMetricsData,
					};
					setMetricsEvents((prev) => [...prev.slice(-199), evt]);
				},
				onBotTtsStarted: () => {
					console.log("🤖 Bot (TTS started):");
					log("TTS started");
				},
				onBotTtsStopped: () => {
					console.log("🤖 Bot (TTS stopped):");
					log("TTS stopped");
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
			setMetricsEvents([]);
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

	return (
		<div className="h-full flex flex-col max-h-screen overflow-hidden">
			<div className="flex-shrink-0 px-6 pt-6">
				<VoiceBotHeader
					status={status}
					showTechnicalLogs={showTechnicalLogs}
					setShowTechnicalLogs={setShowTechnicalLogs}
					showMetrics={showMetrics}
					setShowMetrics={setShowMetrics}
					isConnecting={isConnecting}
					canConnect={canConnect}
					canDisconnect={canDisconnect}
					connect={connect}
					disconnect={disconnect}
				/>

				{status === "error" && <ErrorMessage />}
			</div>

			<div className="flex-1 flex gap-6 px-6 pb-6 min-h-0">
				<ConversationSection
					isConnected={isConnected}
					isListening={isListening}
					conversationMessages={conversationMessages}
					conversationRef={conversationRef}
				/>

				{showTechnicalLogs && (
					<TechnicalLogsSection
						status={status}
						debugLogs={debugLogs}
						debugLogRef={debugLogRef}
					/>
				)}

				{showMetrics && (
					<MetricsSection
						status={status}
						metrics={metricsEvents}
						metricsRef={metricsRef}
					/>
				)}
			</div>

			{client && isConnected && (
				<PipecatClientProvider client={client}>
					<PipecatClientAudio />
				</PipecatClientProvider>
			)}
		</div>
	);
}
