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

// RTVI Metrics (agent-agnostic) - store raw structures per spec
export type RtviMetricEntry = {
	processor: string;
	value: number;
	model?: string;
	// Accept additional fields without enforcing shape
	[key: string]: unknown;
};

export type RtviMetricsData = {
	// Any metric type (e.g., processing, ttfb, characters, custom)
	[metricType: string]: RtviMetricEntry[] | unknown;
};

export type MetricsEvent = {
	id: string;
	timestamp: Date;
	data: RtviMetricsData;
};
