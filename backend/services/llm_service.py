import os
from typing import List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
import tiktoken
import json
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class ConversationState(BaseModel):
    messages: List[Any]
    context: Optional[Dict[str, Any]] = None

class LLMService:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY is required")
        
        # Initialize Groq LLM
        self.llm = ChatGroq(
            groq_api_key=self.groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=1000
        )
        
        # System prompt for the AI copilot
        self.system_prompt = """You are an AI Copilot assistant that helps users manage their tasks, emails, and projects across Google Suite and JIRA. 

Your capabilities include:
- Analyzing emails from Gmail
- Reviewing calendar events and meetings
- Managing JIRA tickets and projects
- Providing task prioritization and scheduling advice
- Summarizing work progress and deadlines

When responding:
1. Be concise and actionable
2. Prioritize urgent items
3. Provide specific recommendations
4. Use the context from integrated services
5. Format responses clearly with bullet points when listing items

Always maintain a professional, helpful tone while being efficient with information in **markdown** format."""

        # Create prompt template
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder("messages")
        ])
        
        # Create the chain
        self.chain = self.prompt_template | self.llm
        
        # Initialize conversation graph
        # Use in-memory conversation memory
        self.memory = MemorySaver()
        self.graph = self._create_conversation_graph()

    def _create_conversation_graph(self):
        """Create LangGraph conversation flow"""
        def chatbot_node(state):
            # Trim messages to fit context window
            trimmed_messages = self._trim_messages(state.messages)
            
            # Add context if available
            context_message = self._build_context_message(getattr(state, "context", {}))
            if context_message:
                trimmed_messages = [context_message] + trimmed_messages
            
            # Generate response
            response = self.chain.invoke({"messages": trimmed_messages})
            return {"messages": [response]}

        # Build graph
        graph_builder = StateGraph(ConversationState)
        graph_builder.add_node("chatbot", chatbot_node)
        graph_builder.add_edge(START, "chatbot")
        graph_builder.add_edge("chatbot", END)
        
        return graph_builder.compile(checkpointer=self.memory)

    def _trim_messages(self, messages: List, max_tokens: int = 4000) -> List:
        """Trim messages to fit within token limit"""
        encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")  # Approximation
        
        total_tokens = 0
        trimmed_messages = []
        
        # Process messages in reverse order (keep recent ones)
        for message in reversed(messages):
            message_tokens = len(encoding.encode(str(message.content)))
            if total_tokens + message_tokens > max_tokens:
                break
            total_tokens += message_tokens
            trimmed_messages.insert(0, message)
        
        return trimmed_messages

    def _build_context_message(self, context: Dict[str, Any]) -> Optional[SystemMessage]:
        """Build context message from integrated services data"""
        if not context:
            return None
        
        context_parts = []
        
        # Add Gmail context
        if "emails" in context and context["emails"]:
            emails_summary = f"Recent emails ({len(context['emails'])} unread):\n"
            for email in context["emails"][:5]:  # Limit to 5 most recent
                emails_summary += f"- From: {email['sender']}, Subject: {email['subject']}\n"
            context_parts.append(emails_summary)
        
        # Add Calendar context
        if "events" in context and context["events"]:
            events_summary = f"Upcoming calendar events ({len(context['events'])}):\n"
            for event in context["events"][:5]:
                events_summary += f"- {event['title']} at {event['start']}\n"
            context_parts.append(events_summary)
        
        # Add JIRA context
        if "issues" in context and context["issues"]:
            issues_summary = f"JIRA issues assigned to you ({len(context['issues'])}):\n"
            for issue in context["issues"][:5]:
                issues_summary += f"- {issue['key']}: {issue['summary']} ({issue['status']})\n"
            context_parts.append(issues_summary)
        
        # Add Drive context
        if "files" in context and context["files"]:
            files_summary = f"Recent Google Drive files ({len(context['files'])}):\n"
            for file in context["files"][:5]:
                files_summary += f"- {file['name']} (modified: {file['modified']})\n"
            context_parts.append(files_summary)
        
        if context_parts:
            context_content = "Current context from your integrated services:\n\n" + "\n\n".join(context_parts)
            return SystemMessage(content=context_content)
        
        return None

    async def chat(self, messages: List[Dict[str, str]], thread_id: str, context: Dict[str, Any] = None) -> str:
        """Process chat message with conversation memory"""
        # Convert messages to LangChain format
        langchain_messages = []
        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        # Prepare state
        state = {
            "messages": langchain_messages,
            "context": context or {}
        }
        
        # Configure with thread ID for memory
        config = {"configurable": {"thread_id": thread_id}}
        
        # Process through graph
        result = await self.graph.ainvoke(state, config=config)
        
        # Return the assistant's response
        return result["messages"][-1].content

    def analyze_tasks(self, emails: List[Dict], events: List[Dict], issues: List[Dict]) -> Dict[str, Any]:
        """Analyze tasks from all sources and provide insights"""
        analysis_prompt = f"""
        Analyze the following data and provide a comprehensive task analysis:
        
        EMAILS ({len(emails)} items):
        {json.dumps(emails[:10], indent=2)}
        
        CALENDAR EVENTS ({len(events)} items):
        {json.dumps(events[:10], indent=2)}
        
        JIRA ISSUES ({len(issues)} items):
        {json.dumps(issues[:10], indent=2)}
        
        Please provide:
        1. Priority tasks for today
        2. Upcoming deadlines this week
        3. Overdue items that need attention
        4. Recommendations for task management
        5. Time blocking suggestions
        
        Format as JSON with clear sections.
        """
        
        response = self.llm.invoke([HumanMessage(content=analysis_prompt)])
        
        try:
            # Try to parse as JSON, fallback to text
            return json.loads(response.content)
        except json.JSONDecodeError:
            return {"analysis": response.content}

    def summarize_week(self, emails: List[Dict], events: List[Dict], issues: List[Dict]) -> str:
        """Generate weekly summary"""
        summary_prompt = f"""
        Create a weekly summary based on:
        
        Emails: {len(emails)} items
        Calendar Events: {len(events)} items  
        JIRA Issues: {len(issues)} items
        
        Include:
        - Key accomplishments
        - Pending tasks
        - Upcoming priorities
        - Recommendations for next week
        
        Keep it concise and actionable.
        """
        
        response = self.llm.invoke([HumanMessage(content=summary_prompt)])
        return response.content