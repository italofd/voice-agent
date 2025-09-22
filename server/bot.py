#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#
import os
import sys

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame, TranscriptionMessage, TranscriptionUpdateFrame
from pipecat.processors.transcript_processor import TranscriptProcessor
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.base_llm import BaseOpenAILLMService
from pipecat.services.google.stt import GoogleSTTService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.services.google.tts import GoogleTTSService
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor

from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.observers.loggers.user_bot_latency_log_observer import UserBotLatencyLogObserver
from pipecat.observers.loggers.llm_log_observer import LLMLogObserver

load_dotenv(override=True)

logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

SYSTEM_INSTRUCTION = """You are Gemini.

CRITICAL RULES:
- No punctuation except periods


"""


async def run_bot(websocket_client):
    # Use default VAD settings (SileroVADAnalyzer doesn't have InputParams)
    vad = SileroVADAnalyzer()
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))


    ws_transport = FastAPIWebsocketTransport(
        websocket=websocket_client,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=vad,
            serializer=ProtobufFrameSerializer(),
        ),
    )

    # Google STT service (much faster than OpenAI Whisper)
    # Requires GOOGLE_APPLICATION_CREDENTIALS env var or Google Cloud auth
    stt = GoogleSTTService()

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
        params=BaseOpenAILLMService.InputParams(
            temperature=0.6,             # Very low temperature for consistent short responses
            frequency_penalty=0.5,       # Heavy penalty to avoid repetition
            presence_penalty=0.5,        # Heavy penalty for long responses
        ),
    )

    # Google TTS service (faster than OpenAI for short responses)
    tts = GoogleTTSService()
    logger.info("Using Google TTS (faster)")


    context = OpenAILLMContext(
        [
            {
                "role": "system",
                "content": SYSTEM_INSTRUCTION,
            }
        ],
    )

        # Create transcript processor and handler
    transcript = TranscriptProcessor()

    context_aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline(
        [
            ws_transport.input(),            # Audio input
            rtvi,
            stt,                             # Speech-to-Text
            transcript.user(),               # Capture user transcripts
            context_aggregator.user(),       # User context
            llm,                             # LLM processing
            tts,                             # Text-to-Speech
            ws_transport.output(),           # Audio output
            transcript.assistant(),          # Capture assistant text BEFORE TTS
            context_aggregator.assistant(),  # Assistant context
        ]
    )

    # Optimized task parameters for lower latency
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,        # Disable metrics to reduce overhead
            enable_usage_metrics=True,  # Disable usage metrics for speed
            allow_interruptions=True,    # Allow user interruptions for better UX
            observers=[RTVIObserver(rtvi), UserBotLatencyLogObserver(), LLMLogObserver()],  # Add the observer here

        ),
    )

    @ws_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Pipecat Client connected")
        # Kick off the conversation with a greeting
        await rtvi.set_bot_ready()
        await task.queue_frames([LLMRunFrame()])


    @ws_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Pipecat Client disconnected")
        await task.cancel()

    @transcript.event_handler("on_transcript_update")
    async def on_transcript_update(processor, frame):
        """Handle transcript updates and send to frontend via websocket"""
        for message in frame.messages:
            logger.info(f"Transcript update: {message.content}")

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)
