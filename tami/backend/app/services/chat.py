"""Chat service - integrates with existing meeting-transcriber code."""

import sys
from pathlib import Path
from typing import List, AsyncGenerator
from loguru import logger

# Add parent directory to path to import from meeting-transcriber
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from lib.chat.chatbot import Chatbot
from lib.utils.models import TranscriptResult, Summary


class ChatService:
    """Service for interactive Q&A about meetings."""

    async def chat(
        self,
        user_question: str,
        transcript: TranscriptResult,
        summary: Summary,
        context: str,
        participants: List[str],
        api_key: str,
        model: str = "gpt-4o-mini",
        conversation_history: List[dict] = None
    ) -> str:
        """Chat with the meeting transcript.

        Args:
            user_question: User's question
            transcript: Transcript result
            summary: Meeting summary
            context: Meeting context
            participants: List of participants
            api_key: OpenAI API key
            model: Model to use for chat
            conversation_history: Previous conversation messages

        Returns:
            Assistant's response
        """
        logger.info(f"Processing chat question with {model}")

        try:
            # Create chatbot with only api_key and model
            chatbot = Chatbot(
                api_key=api_key,
                model=model
            )

            # Set context with transcript and summary
            chatbot.set_context(
                transcript=transcript,
                summary=summary
            )

            # Restore conversation history if provided
            if conversation_history:
                chatbot.conversation_history = conversation_history

            response = await chatbot.chat(user_question)
            logger.info("Chat response generated")
            return response

        except Exception as e:
            logger.error(f"Chat failed: {e}")
            raise

    async def chat_stream(
        self,
        user_question: str,
        transcript: TranscriptResult,
        summary: Summary,
        context: str,
        participants: List[str],
        api_key: str,
        model: str = "gpt-4o-mini",
        conversation_history: List[dict] = None
    ) -> AsyncGenerator[str, None]:
        """Chat with streaming response.

        Args:
            user_question: User's question
            transcript: Transcript result
            summary: Meeting summary
            context: Meeting context
            participants: List of participants
            api_key: OpenAI API key
            model: Model to use for chat
            conversation_history: Previous conversation messages

        Yields:
            Chunks of the assistant's response
        """
        logger.info(f"Processing streaming chat question with {model}")

        try:
            # Create chatbot with only api_key and model
            chatbot = Chatbot(
                api_key=api_key,
                model=model
            )

            # Set context with transcript and summary
            chatbot.set_context(
                transcript=transcript,
                summary=summary
            )

            # Restore conversation history if provided
            if conversation_history:
                chatbot.conversation_history = conversation_history

            # For now, return the full response
            # TODO: Implement true streaming when chatbot supports it
            response = await chatbot.chat(user_question)

            # Yield in chunks to simulate streaming
            chunk_size = 50
            for i in range(0, len(response), chunk_size):
                yield response[i:i+chunk_size]

        except Exception as e:
            logger.error(f"Streaming chat failed: {e}")
            raise


# Singleton instance
chat_service = ChatService()
