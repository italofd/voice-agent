export type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

export type ConversationMessage = {
	id: string;
	type: "user" | "bot";
	text: string;
	timestamp: Date;
	isTyping?: boolean;
};
