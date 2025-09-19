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
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.base_llm import BaseOpenAILLMService
from pipecat.services.google.stt import GoogleSTTService
from pipecat.services.openai.tts import OpenAITTSService

from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

load_dotenv(override=True)

logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

SYSTEM_INSTRUCTION = """You are Gemini, a helpful robot.

CRITICAL RULES:
- No punctuation except periods
- Be direct and friendly

"""


async def run_bot(websocket_client):
    # Use default VAD settings (SileroVADAnalyzer doesn't have InputParams)
    vad = SileroVADAnalyzer()

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
            temperature=0.5,             # Lower creativity = more consistent short responses
            frequency_penalty=0.5,       # Higher penalty = avoid repetition
            presence_penalty=0.5,        # Encourage varied vocabulary
        ),
    )

    # TTS service (Text-to-Speech) - Optimized for speed
    tts = OpenAITTSService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="tts-1",
        voice="echo"
    )

    context = OpenAILLMContext(
        [
            {
                "role": "system",
                "content": SYSTEM_INSTRUCTION,
            }
        ],
    )
    context_aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline(
        [
            ws_transport.input(),           # Audio input
            stt,                           # Speech-to-Text
            context_aggregator.user(),     # User context
            llm,                          # LLM processing
            tts,                          # Text-to-Speech
            ws_transport.output(),        # Audio output
            context_aggregator.assistant(), # Assistant context
        ]
    )

    # Optimized task parameters for lower latency
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=False,        # Disable metrics to reduce overhead
            enable_usage_metrics=False,  # Disable usage metrics for speed
            allow_interruptions=True,    # Allow user interruptions for better UX
        ),
    )

    @ws_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Pipecat Client connected")
        # Kick off the conversation with a greeting
        await task.queue_frames([LLMRunFrame()])

    @ws_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Pipecat Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)
