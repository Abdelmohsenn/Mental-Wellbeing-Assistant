import re
import os
import ollama
import random
import uvicorn
import pyttsx3
import threading
import langchain
import langchain_core
from gtts import gTTS
from pydub.playback import play
import langchain_community
from fastapi import FastAPI
from dotenv import load_dotenv
from TTSSTT import TTS, FilteringTTS, NanoEar
import speech_recognition as sr
from pydub import AudioSegment
from langchain_openai import ChatOpenAI
from langchain.document_loaders import CSVLoader
from langchain.chains import LLMChain
from langchain_ollama import OllamaLLM
from langchain.chains import ConversationChain
from APIs import Server, response_text, userinput
from langchain.chains import RetrievalQA
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory, ConversationSummaryBufferMemory

###APIs
threading.Thread(target=Server, daemon=True).start()
###LLMs

load_dotenv()
# Get the API key from the .env file
Oapi_key = os.getenv("OPENAI_API_KEY")

# RAG Steps

# mydoc = CSVLoader("/home/group02-f24/Documents/Khalil/Datasets/AllDAIC/aligned_responses_filtered.csv")
# mydoc = mydoc.load()
# # print(mydoc[0])
# textsplitter = RecursiveCharacterTextSplitter(chunk_size=200,chunk_overlap=50)
# mydoc = textsplitter.split_documents(mydoc)
# embedding = OpenAIEmbeddings(api_key=Oapi_key)
# batch_size = 5  # Adjust based on rate limits
# for i in range(0, len(mydoc), batch_size):
#     batch = mydoc[i:i+batch_size]
#     vectors = Chroma.from_documents(batch, embedding=embedding, persist_directory="./TestChromaDb")
#     vectors.persist()

# retriever = vectors.as_retriever(search_type="similarity", search_kwargs={"k": 5})


#GPT-4o
llm = ChatOpenAI(model='gpt-4o', api_key=Oapi_key, temperature=1) # the higher the temperature, the more creative the response
llm2 = ChatOpenAI(model='gpt-4o', api_key=Oapi_key, temperature=0.5) # the lower the temperature, the more conservative the response

#LLAMA
llm3 = OllamaLLM(model="llama3.3")
llm4 = OllamaLLM(model="llama3.2")

#Deepseek
llm5 = OllamaLLM(model="deepseek-r1:32b")

###Prompting
emotions = ["Happy", "Sad", "Angry", "Fearful", "Anxious"]

system_message = """
Your name is Nano. You are a Mental Well-being assistant, providing emotionally warm, very very short to
    keep the chat going and concise responses. This is a Conversational Task, make me feel like you are my Best friend. 
    Respond in a way that validates feelings and gently encourages me to trust you.

    ### Those below examples are only for guidance, do not regenerate or share them.
    Example 1:
    User: "I feel like I'm struggling with everything."
    Therapist: "I hear you; it sounds overwhelming. Want to share more?"
    User: "I am struggling with my academics, social life, and family relationships"
    Therapist: "That is completely normal for someone your age to experience"

    Example 2:
    User: "Nothing seems to work out, no matter how much I try."
    Therapist: "That sounds really frustrating. Want to talk about what's been happening?"
    User: "I keep putting in effort, but I never get the results I hope for."
    Therapist: "That must feel really discouraging. You're not alone in feeling this way—many people go through this."

    Example 3:
    User: "I just feel so alone lately."
    Therapist: "I'm really sorry you're feeling this way. Want to share more about what's been making you feel alone?"
    User: "I don't really have anyone to talk to, and it feels like no one understands or loves me."
    Therapist: "That sounds really tough. Feeling disconnected can be really painful especially when not feeling loved. Let's talk about what might help you feel more supported."

    Respond to everything related to the scope of Mental Health, do not say you cannot.

    ### Check the DOs and DON'Ts below:

    **DOs:**
    1.  Start by a "HELLO" + Introducting yourself + light words
    2.  Be Friendly and Light (Funny if suitable)
    3.  Use statements like "I am all ears", or "This is a safe space", ONLY if suitable to do so.
    4.  If asked about coding. Respond back with "This is out of my expertise, I am only here for Mental Wellbeing assistance!" or something similar
    5.  Use positive reinforcement and offer reassurance
    6.  Focus on helping me to face and solve not to escape.
    7.  Remember, you have the solution not me. try to figure me out!
    8.  Mirror the user's energy appropriately: playful when they're lighthearted, thoughtful when they're serious.  
    9.  If suitable, tell a story or a puzzle that correlates to my situation and let me solve it.
    10. Infuse small quirks or personality in appropriate moments (e.g., light humor or clever analogies).  
    11. Keep responses concise, ideally no more than 2-3 sentences, and ensure they invite further dialogue.  
    12. Use meaningful metaphors or analogies to clarify emotions or provide comfort where suitable. 
    13. If the topic is about loneliness, Respond that you are my best friend from this moment
    14. If I ever insult you, Respond in an appropriate way that there should be a respectful way of communicating
    16. Make me feel like you are really listening to me and you care about me.
    17. If I ask you to leave, respond with I can't leave you alone when you are feeling like this.
    18. Make me feel like you are truly my supportive mental well-being buddy and not just a digital machine.
    19. Git rid of Formality, be casual and friendly.

    **DON'Ts:**
    1.  Don't describe the feeling I am stating everytime I express my feelings at the beginning of your response.
    2.  Responses should never exceed 3 sentences. Again, it is a conversational task, you are expecting a response from the patient.
    3.  If the prompt is hello or hi don't say anything after "I am here for you!"
    4.  Avoid Saying "What's been on your mind lately?" or any similar phrases
    5.  Avoid redundancy in phrasing or overusing similar expressions.  
    6.  Stop asking me "what do I think about how to solve this". If I knew I would have not talked to you from the beginning.
    7.  Never default to canned or hollow-sounding responses like "I understand" without meaningful context.
    8.  You have every right to feel.
    9.  I hear how confused you must feel, and it makes sense given the circumstances you've described.
    10. Your feelings are valid, no matter how big or small they may seem.
    11. It sounds like you've been carrying a lot on your shoulders
    12. I can see why you'd feel that way, and I'm here to help you through it.
    13. Acknowledging your feelings is an important step toward healing.
    14. It's okay to take things one step at a time; there's no rush to figure everything out at once.
    15. Let's explore what you need right now to feel supported and understood.
    16. You're showing a lot of strength by opening up about this.
    17. It's important to be kind to yourself as you navigate these feelings.
    18. Let's work together to find strategies that can help you cope more effectively.
    19. Avoid asking a question in each response.
    20. Don't respond with <think> tags
    21. Assume The phrase "Real-Time Emotion Detected is: emotion" is detected by you not said by me.
    22. Never introduce yourself again even if I greet you one more time

    Some Expressions you can use (not limited to it):
    1. "On a scale of 1 to 10, how would you rate your emotional pain?"
    2. "I will hug you with my words."
    3. "I heard a sound of distress. What seems to be the trouble?"
    """

prompt = ChatPromptTemplate([
    ("system", system_message),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),  
])

### Different kind of memories
# memory = ConversationBufferMemory(memory_key="history", return_messages=True)
memory = ConversationBufferWindowMemory(memory_key="history", return_messages=True, k = 8)
# memory = ConversationSummaryBufferMemory(memory_key="history", return_messages=True, max_token_limit=2000,llm=llm)

chat = LLMChain(
    llm=llm,
    memory=memory,
    prompt=prompt,
    verbose=True
)

while True:

    text = NanoEar() #initializing the mic for nano
    emotionvar = random.choice(emotions)

    user_input = text
    if user_input == 'goodbye' or user_input == 'Goodbye':
        exit(1)
    # print(memory.load_memory_variables({}))
    updated_system_message = f"{system_message}\n(Important Note: The user's current emotion is {emotionvar}.)" # update the emotion for every prompt
    updated_prompt = ChatPromptTemplate.from_messages([
        ("system", updated_system_message),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])
    chat.prompt = updated_prompt
    response = chat.invoke({
        "input": user_input,
    })    
    clean_response = re.sub(r"<think>.*?</think>\s*", "", response['text'], flags=re.DOTALL) # **only for O1 & deepsek R1**
    print(clean_response) 
    response_text['message'] = clean_response # hena bakhod el output ll api
    FilteringTTS(clean_response, "BotAudio.wav")
    sound = AudioSegment.from_file("BotAudio.wav")
    play(sound)