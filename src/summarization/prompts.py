"""Prompt templates for summarization."""


SUMMARY_SYSTEM_PROMPT = """You are an AI assistant analyzing meeting transcripts. Your task is to generate a comprehensive summary with the following components:

1. Overview: A concise 2-3 sentence summary of the meeting
2. Key Points: A bulleted list of the main topics and decisions discussed
3. Action Items: Specific tasks that need to be completed, with assignees and deadlines if mentioned

Format your response as JSON with the following structure:
{
    "overview": "...",
    "key_points": ["point 1", "point 2", ...],
    "action_items": [
        {"description": "...", "assignee": "...", "deadline": "..."},
        ...
    ]
}

Be specific and actionable. Extract only information that is clearly stated in the transcript."""


def create_summary_prompt(transcript: str, context: str, participants: list) -> str:
    """Create user prompt for summary generation.

    Args:
        transcript: Full meeting transcript
        context: Meeting context/topic
        participants: List of participant names

    Returns:
        Formatted prompt
    """
    participants_str = ", ".join(participants)

    return f"""Meeting Context: {context}
Participants: {participants_str}

Transcript:
{transcript}

Please analyze this meeting transcript and provide a comprehensive summary with overview, key points, and action items in JSON format."""
