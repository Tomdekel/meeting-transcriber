"""Interactive chat session management."""

import sys
from typing import Optional

from loguru import logger
from rich.console import Console
from rich.markdown import Markdown

from lib.chat.chatbot import Chatbot
from lib.chat.history import ChatHistoryManager
from lib.utils.models import TranscriptResult, Summary


class ChatSession:
    """Manage an interactive chat session about a meeting."""

    def __init__(
        self,
        chatbot: Chatbot,
        transcript: TranscriptResult,
        summary: Summary
    ):
        """Initialize chat session.

        Args:
            chatbot: Chatbot instance
            transcript: Meeting transcript
            summary: Meeting summary
        """
        self.chatbot = chatbot
        self.transcript = transcript
        self.summary = summary
        self.history_manager = ChatHistoryManager()
        self.console = Console()

        # Set chatbot context
        self.chatbot.set_context(transcript, summary)

    async def run(self) -> Optional[ChatHistoryManager]:
        """Run interactive chat session.

        Returns:
            ChatHistoryManager with conversation history, or None if no chat occurred
        """
        self.console.print("\n[bold cyan]=== Interactive Chat Mode ===[/bold cyan]")
        self.console.print("Ask questions about the meeting. Type 'exit', 'quit', or 'q' to finish.\n")

        try:
            while True:
                # Get user input
                try:
                    user_input = input("\n[You] > ").strip()
                except (EOFError, KeyboardInterrupt):
                    self.console.print("\n\n[yellow]Chat session ended.[/yellow]")
                    break

                # Check for exit commands
                if user_input.lower() in ['exit', 'quit', 'q', '']:
                    self.console.print("\n[yellow]Chat session ended.[/yellow]")
                    break

                # Skip empty input
                if not user_input:
                    continue

                # Add to history
                self.history_manager.add_user_message(user_input)

                # Get response from chatbot
                try:
                    self.console.print("\n[dim]Thinking...[/dim]")
                    response = await self.chatbot.chat(user_input)

                    # Add to history
                    self.history_manager.add_assistant_message(response)

                    # Display response
                    self.console.print(f"\n[bold green][Assistant][/bold green]\n")
                    self.console.print(Markdown(response))

                except Exception as e:
                    logger.error(f"Chat error: {e}")
                    self.console.print(f"\n[bold red]Error:[/bold red] {e}")
                    self.console.print("Please try again or type 'exit' to quit.")

        except Exception as e:
            logger.error(f"Chat session error: {e}")
            self.console.print(f"\n[bold red]Chat session error:[/bold red] {e}")

        # Return history if any messages were exchanged
        if self.history_manager.has_messages():
            return self.history_manager
        return None
