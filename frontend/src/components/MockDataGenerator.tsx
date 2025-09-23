import { MetricsEvent, RtviMetricsData } from './types';

// Helper function to generate mock metrics data for testing timeline charts
export function generateMockMetricsData(): MetricsEvent[] {
	const events: MetricsEvent[] = [];
	const baseTime = Date.now() - 60000; // Start 1 minute ago
	
	// Simulated processors
	const processors = ['openai-llm', 'elevenlabs-tts', 'whisper-stt'];
	
	// Generate 20 events over 1 minute
	for (let i = 0; i < 20; i++) {
		const timestamp = new Date(baseTime + (i * 3000)); // Every 3 seconds
		
		const data: RtviMetricsData = {};
		
		// TTFB events (random occurrences)
		if (Math.random() > 0.7) {
			data.ttfb = [
				{
					processor: processors[Math.floor(Math.random() * processors.length)],
					value: Math.random() * 200 + 50, // 50-250ms
				}
			];
		}
		
		// Processing events (more frequent)
		if (Math.random() > 0.4) {
			data.processing = [
				{
					processor: processors[Math.floor(Math.random() * processors.length)],
					value: Math.random() * 1500 + 200, // 200-1700ms
				}
			];
		}
		
		// Token events (when LLM processes)
		if (Math.random() > 0.6) {
			const completionTokens = Math.floor(Math.random() * 150 + 20);
			const promptTokens = Math.floor(Math.random() * 100 + 30);
			data.tokens = [
				{
					processor: 'openai-llm',
					value: completionTokens + promptTokens,
					completion_tokens: completionTokens,
					prompt_tokens: promptTokens,
					total_tokens: completionTokens + promptTokens,
				}
			];
		}
		
		// Character events (when TTS processes)
		if (Math.random() > 0.5) {
			data.characters = [
				{
					processor: 'elevenlabs-tts',
					value: Math.floor(Math.random() * 200 + 50), // 50-250 characters
				}
			];
		}
		
		// Only add event if it has some data
		if (Object.keys(data).length > 0) {
			events.push({
				id: `mock-${i}-${Date.now()}`,
				timestamp,
				data
			});
		}
	}
	
	return events;
}
