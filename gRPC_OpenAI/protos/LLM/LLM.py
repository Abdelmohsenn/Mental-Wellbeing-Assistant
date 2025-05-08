import os
from dotenv import load_dotenv
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_ollama import OllamaLLM
from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory
from langchain.chains import ConversationChain

from system_prompt import system_message

# Load environment variables
def load_api_key():
    load_dotenv()
    return os.getenv("API_KEY")

API_KEY = load_api_key()
backgrounds = {}
# Initialize embeddings and vector store
test_embedding = OpenAIEmbeddings(api_key=API_KEY, model="text-embedding-3-large")
vectors = FAISS.load_local("/home/group02-f24/Documents/Khalil/Backend/Mental-Wellbeing-Assistant/APIs/Mental-Wellbeing-Assistant/gRPC_OpenAI/protos/LLM/AlignedResponsesFiltered_RagDoc", embeddings=test_embedding, allow_dangerous_deserialization=True) # loading the faiss index


# Initialize LLMs
main_llm = ChatOpenAI(model="gpt-4o", api_key=API_KEY, temperature=0.8)
emo_llm = OllamaLLM(model="gemma3:4b")

# Emotion classification chain
emo_prompt = ChatPromptTemplate.from_template(
    "Classify the emotion of the below expression by providing one word response from:"
    " Sadness, Happiness, Surprise, Anger, Neutral, Fear. Expression: {expression}"
)
emo_chain = emo_prompt | main_llm

# In-memory storage of conversation chains by session ID
sessions = {}


def retrieve_response(prompt: str, k: int = 2) -> str:
    """
    Retrieve top-k similar therapy responses from FAISS.
    """
    docs = vectors.similarity_search(prompt, k=k)
    if not docs:
        return "I'm here to help, but I don't have an answer for that yet."

    parts = []
    for idx, doc in enumerate(docs, start=1):
        parts.append(f"{idx}. {doc.metadata.get('response')}")
    return "\n".join(parts)


def restore_memory(
    initial_messages: list[dict[str, str]],
    window: bool = False,
    k: int = 10,
) -> ConversationBufferMemory:
    """
    Create a ConversationBufferMemory (or WindowMemory) preloaded with initial_messages.
    initial_messages: list of { 'role': 'ai'|'human', 'content': str }
    """
    history = InMemoryChatMessageHistory()
    for msg in initial_messages:
        if msg["role"] == "ai":
            history.add_ai_message(msg["content"])
        else:
            history.add_user_message(msg["content"])

    if window:
        return ConversationBufferWindowMemory(
            memory_key="history", return_messages=True, chat_memory=history, k=k
        )
    return ConversationBufferMemory(
        memory_key="history", return_messages=True, chat_memory=history
    )


# def get_chain(
#     session_id: str,
# ) -> ConversationChain:
#     """
#     Create or retrieve a ConversationChain for a given session_id.
#     """
#     if session_id in sessions:
#         return sessions[session_id]

#     # memory = initializing_memory(initial_messages, window=window_memory)
#     # chain = ConversationChain(
#     #     llm=llm,
#     #     memory=memory,
#     #     prompt=system_prompt,
#     #     verbose=True,
#     # )
#     # sessions[session_id] = chain
#     # return chain


def initiate_session(session_id: str, background: str, user_id: str) -> bool:
    """
    Initialize a new conversation memory for session_id with user background in the system message.
    Returns True if created, False if already existed or an error occured.
    """
    if session_id in sessions:
        return False
    try:
        # Build a system prompt that includes the static system_message plus the background
        combined_system = (
            f"{system_message}\n"
            f"### User Background:\n{background}\n"
        )
        backgrounds[user_id] = combined_system
        prompt = ChatPromptTemplate.from_messages([
            ("system", combined_system),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])

        # Create an empty memory for the new session
        memory = ConversationBufferMemory(memory_key="history", return_messages=True)
        chain = ConversationChain(
            llm=main_llm,
            memory=memory,
            prompt=prompt,
            verbose=False,
        )
        sessions[session_id] = chain
        return True
    except Exception as e:
        print(f"Error initiating session: {e}")
        return False

def end_session(session_id: str) -> bool:
    """
    End a session by removing it from the sessions dictionary.
    Returns True if session was ended, False if it didn't exist.
    """
    if session_id in sessions:
        del sessions[session_id]
        return True
    return False


def generate_response(user_input: str, session_id: str, user_id: str) -> str:
    """
    Generate a response for user_input under the given session_id.
    Automatically creates a session if needed using only the base system_message.
    """
    # Step 1: Emotion detection (optional)
    # emo = emo_chain.invoke({"expression": user_input})
    # emotion = emo.content if hasattr(emo, "content") else str(emo)

    # Step 2: RAG context retrieval
    rag_context = retrieve_response(user_input)

    # Step 3: Build system prompt dynamically
    dynamic_system = (
        f"{backgrounds[user_id]}"
        f"(User emotion: Sad)\n"
        f"### Retrieved context:\n{rag_context}\n"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", dynamic_system),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    # Step 4: Update the chain with the new prompt
    if session_id in sessions:
        memory = sessions[session_id].memory
    else: 
        return "Error: You need to start a new session first!"  
    chain = ConversationChain(
        llm=main_llm,
        memory=memory,
        prompt=prompt,
        verbose=False,
    )

    # Step 5: Invoke chain
    result = chain.invoke({"input": user_input})
    return result.content if hasattr(result, "content") else result.get("response", "")
