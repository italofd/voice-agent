import { useState } from "react";
import {
	ConnectionStatus,
	MetricsEvent,
	RtviMetricEntry,
	RtviMetricsData,
} from "./types";
import TimelineCharts from "./TimelineCharts";

interface MetricsSectionProps {
	status: ConnectionStatus;
	metrics: MetricsEvent[];
	metricsRef: React.RefObject<HTMLDivElement | null>;
}

type Aggregated = Record<string, Record<string, RtviMetricEntry[]>>;

function normalizeProcessor(name: unknown): string {
	if (typeof name !== "string") return "unknown";
	return name.trim();
}

function aggregateMetrics(events: MetricsEvent[]): Aggregated {
	// metricType -> processor -> entries
	const agg: Aggregated = {};

	for (const evt of events) {
		const data = evt.data as RtviMetricsData;
		for (const metricType of Object.keys(data)) {
			const value = (data as any)[metricType];
			if (!Array.isArray(value)) continue; // Only aggregate array-based metrics

			if (!agg[metricType]) agg[metricType] = {};

			for (const raw of value as RtviMetricEntry[]) {
				const processor = normalizeProcessor((raw as any)?.processor);
				if (!agg[metricType][processor]) {
					agg[metricType][processor] = [];
				}
				const augmented: RtviMetricEntry = {
					...(raw as RtviMetricEntry),
					_receivedAt: evt.timestamp.toISOString(),
				};
				agg[metricType][processor].push(augmented);
			}
		}
	}
	return agg;
}

export default function MetricsSection({
	status,
	metrics,
	metricsRef,
}: MetricsSectionProps) {
	const [showTimeline, setShowTimeline] = useState(false);
	const aggregated = aggregateMetrics(metrics);

	const metricTypes = Object.keys(aggregated);

	return (
		<div
			className={`${
				showTimeline ? "w-[800px]" : "w-96"
			} bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border-2 shadow-2xl flex flex-col min-h-0 transition-all duration-300 ${
				status === "connected"
					? "border-indigo-300 dark:border-indigo-700"
					: status === "error"
					? "border-red-300 dark:border-red-700"
					: "border-gray-200 dark:border-gray-700"
			}`}
		>
			<div className="border-b border-gray-200/50 dark:border-gray-700/50 p-6 flex-shrink-0">
				<div className="flex items-center justify-between">
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
								d="M11 11V7a4 4 0 10-4 4h4zm0 0v4a4 4 0 104-4h-4z"
							/>
						</svg>
						Metrics
					</h2>
					<button
						onClick={() => setShowTimeline(!showTimeline)}
						className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
							showTimeline
								? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
								: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
						}`}
					>
						{showTimeline ? "Raw Data" : "Timeline"}
					</button>
				</div>
			</div>

			<div className="flex-1 p-6 min-h-0">
				{showTimeline ? (
					<div className="h-full overflow-y-auto scrollbar-thin">
						<TimelineCharts metrics={metrics} />
					</div>
				) : (
					<div
						ref={metricsRef}
						className="h-full overflow-y-auto scrollbar-thin space-y-4"
					>
						{metricTypes.length === 0 ? (
							<div className="text-gray-500 dark:text-gray-400 text-center py-8">
								No metrics yet...
							</div>
						) : (
							metricTypes.map((metricType) => (
								<div
									key={metricType}
									className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border p-4"
								>
									<div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
										{metricType}
									</div>
									<div className="space-y-3">
										{Object.entries(aggregated[metricType]).map(
											([processor, entries]) => (
												<div
													key={processor}
													className="rounded-xl border p-3 bg-white/70 dark:bg-gray-900/40"
												>
													<div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
														{processor}
													</div>
													<div className="space-y-2">
														{entries.map((entry, idx) => (
															<pre
																key={idx}
																className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono"
															>
																{JSON.stringify(entry, null, 2)}
															</pre>
														))}
													</div>
												</div>
											)
										)}
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
