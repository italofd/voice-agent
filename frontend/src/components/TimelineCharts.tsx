import React from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import { MetricsEvent, RtviMetricEntry, RtviMetricsData } from './types';

interface TimelineChartsProps {
	metrics: MetricsEvent[];
}

interface TimelineDataPoint {
	timestamp: string;
	time: number; // Unix timestamp for proper ordering
	[key: string]: any;
}

interface ProcessedMetrics {
	ttfbData: TimelineDataPoint[];
	processingData: TimelineDataPoint[];
	tokensData: TimelineDataPoint[];
	charactersData: TimelineDataPoint[];
}

function normalizeProcessor(name: unknown): string {
	if (typeof name !== 'string') return 'unknown';
	return name.trim();
}

function processMetricsForTimeline(events: MetricsEvent[]): ProcessedMetrics {
	const ttfbData: TimelineDataPoint[] = [];
	const processingData: TimelineDataPoint[] = [];
	const tokensData: TimelineDataPoint[] = [];
	const charactersData: TimelineDataPoint[] = [];
	
	// Cumulative counters for tokens and characters
	const cumulativeTokens: { [processor: string]: { completion: number; prompt: number; total: number } } = {};
	const cumulativeCharacters: { [processor: string]: number } = {};

	for (const event of events) {
		const data = event.data as RtviMetricsData;
		const timestamp = event.timestamp.toISOString();
		const time = event.timestamp.getTime();

		// Process each metric type
		for (const metricType of Object.keys(data)) {
			const value = (data as any)[metricType];
			if (!Array.isArray(value)) continue;

			const entries = value as RtviMetricEntry[];

			for (const entry of entries) {
				const processor = normalizeProcessor(entry.processor);
				
				if (metricType === 'ttfb') {
					// TTFB: per-event timeline (value = time spent)
					ttfbData.push({
						timestamp,
						time,
						[processor]: entry.value,
						processor,
						value: entry.value,
					});
				} else if (metricType === 'processing') {
					// Processing: per-event timeline (value = time spent)
					processingData.push({
						timestamp,
						time,
						[processor]: entry.value,
						processor,
						value: entry.value,
					});
				} else if (metricType === 'tokens') {
					// Tokens: cumulative data
					if (!cumulativeTokens[processor]) {
						cumulativeTokens[processor] = { completion: 0, prompt: 0, total: 0 };
					}
					
					// Extract token types from entry (assuming they exist in the data)
					const completionTokens = (entry as any).completion_tokens || 0;
					const promptTokens = (entry as any).prompt_tokens || 0;
					const totalTokens = (entry as any).total_tokens || entry.value || 0;
					
					cumulativeTokens[processor].completion += completionTokens;
					cumulativeTokens[processor].prompt += promptTokens;
					cumulativeTokens[processor].total += totalTokens;
					
					tokensData.push({
						timestamp,
						time,
						processor,
						[`${processor}_completion`]: cumulativeTokens[processor].completion,
						[`${processor}_prompt`]: cumulativeTokens[processor].prompt,
						[`${processor}_total`]: cumulativeTokens[processor].total,
					});
				} else if (metricType === 'characters') {
					// Characters: cumulative data
					if (!cumulativeCharacters[processor]) {
						cumulativeCharacters[processor] = 0;
					}
					
					cumulativeCharacters[processor] += entry.value;
					
					charactersData.push({
						timestamp,
						time,
						processor,
						[processor]: cumulativeCharacters[processor],
						value: cumulativeCharacters[processor],
					});
				}
			}
		}
	}

	// Sort all data by timestamp
	const sortByTime = (a: TimelineDataPoint, b: TimelineDataPoint) => a.time - b.time;
	ttfbData.sort(sortByTime);
	processingData.sort(sortByTime);
	tokensData.sort(sortByTime);
	charactersData.sort(sortByTime);

	return { ttfbData, processingData, tokensData, charactersData };
}

function formatTimestamp(timestamp: string): string {
	return new Date(timestamp).toLocaleTimeString();
}

// Color palette for different processors
const colors = [
	'#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
	'#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
];

function getProcessorColor(processor: string, index: number): string {
	return colors[index % colors.length];
}

export default function TimelineCharts({ metrics }: TimelineChartsProps) {
	const processedMetrics = processMetricsForTimeline(metrics);
	
	if (metrics.length === 0) {
		return (
			<div className="text-gray-500 dark:text-gray-400 text-center py-8">
				No metrics data available for timeline charts...
			</div>
		);
	}

	// Get unique processors for each chart type
	const ttfbProcessors = Array.from(new Set(processedMetrics.ttfbData.map(d => d.processor)));
	const processingProcessors = Array.from(new Set(processedMetrics.processingData.map(d => d.processor)));
	const tokensProcessors = Array.from(new Set(processedMetrics.tokensData.map(d => d.processor)));
	const charactersProcessors = Array.from(new Set(processedMetrics.charactersData.map(d => d.processor)));

	return (
		<div className="space-y-8">
			{/* TTFB Chart */}
			{processedMetrics.ttfbData.length > 0 && (
				<div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border p-6">
					<h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
						Time to First Byte (TTFB) Timeline
					</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={processedMetrics.ttfbData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis 
									dataKey="timestamp" 
									tickFormatter={formatTimestamp}
									interval="preserveStartEnd"
								/>
								<YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
								<Tooltip 
									labelFormatter={(label) => `Time: ${formatTimestamp(label as string)}`}
									formatter={(value: any, name: string) => [`${value}ms`, name]}
								/>
								<Legend />
								{ttfbProcessors.map((processor, index) => (
									<Line
										key={processor}
										type="monotone"
										dataKey={processor}
										stroke={getProcessorColor(processor, index)}
										strokeWidth={2}
										dot={{ r: 4 }}
										name={processor}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* Processing Chart */}
			{processedMetrics.processingData.length > 0 && (
				<div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border p-6">
					<h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
						Processing Time Timeline (LLM + TTS)
					</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={processedMetrics.processingData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis 
									dataKey="timestamp" 
									tickFormatter={formatTimestamp}
									interval="preserveStartEnd"
								/>
								<YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
								<Tooltip 
									labelFormatter={(label) => `Time: ${formatTimestamp(label as string)}`}
									formatter={(value: any, name: string) => [`${value}ms`, name]}
								/>
								<Legend />
								{processingProcessors.map((processor, index) => (
									<Line
										key={processor}
										type="monotone"
										dataKey={processor}
										stroke={getProcessorColor(processor, index)}
										strokeWidth={2}
										dot={{ r: 4 }}
										name={processor}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* Tokens Chart */}
			{processedMetrics.tokensData.length > 0 && (
				<div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border p-6">
					<h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
						Cumulative Tokens Timeline
					</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={processedMetrics.tokensData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis 
									dataKey="timestamp" 
									tickFormatter={formatTimestamp}
									interval="preserveStartEnd"
								/>
								<YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
								<Tooltip 
									labelFormatter={(label) => `Time: ${formatTimestamp(label as string)}`}
									formatter={(value: any, name: string) => [`${value} tokens`, name]}
								/>
								<Legend />
								{tokensProcessors.flatMap((processor, processorIndex) => [
									<Line
										key={`${processor}_completion`}
										type="monotone"
										dataKey={`${processor}_completion`}
										stroke={getProcessorColor(`${processor}_completion`, processorIndex * 3)}
										strokeWidth={2}
										strokeDasharray="5 5"
										dot={{ r: 3 }}
										name={`${processor} (Completion)`}
									/>,
									<Line
										key={`${processor}_prompt`}
										type="monotone"
										dataKey={`${processor}_prompt`}
										stroke={getProcessorColor(`${processor}_prompt`, processorIndex * 3 + 1)}
										strokeWidth={2}
										strokeDasharray="10 5"
										dot={{ r: 3 }}
										name={`${processor} (Prompt)`}
									/>,
									<Line
										key={`${processor}_total`}
										type="monotone"
										dataKey={`${processor}_total`}
										stroke={getProcessorColor(`${processor}_total`, processorIndex * 3 + 2)}
										strokeWidth={3}
										dot={{ r: 4 }}
										name={`${processor} (Total)`}
									/>
								])}
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{/* Characters Chart */}
			{processedMetrics.charactersData.length > 0 && (
				<div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border p-6">
					<h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
						Cumulative Characters Timeline
					</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={processedMetrics.charactersData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis 
									dataKey="timestamp" 
									tickFormatter={formatTimestamp}
									interval="preserveStartEnd"
								/>
								<YAxis label={{ value: 'Characters', angle: -90, position: 'insideLeft' }} />
								<Tooltip 
									labelFormatter={(label) => `Time: ${formatTimestamp(label as string)}`}
									formatter={(value: any, name: string) => [`${value} chars`, name]}
								/>
								<Legend />
								{charactersProcessors.map((processor, index) => (
									<Line
										key={processor}
										type="monotone"
										dataKey={processor}
										stroke={getProcessorColor(processor, index)}
										strokeWidth={2}
										dot={{ r: 4 }}
										name={processor}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}
		</div>
	);
}
