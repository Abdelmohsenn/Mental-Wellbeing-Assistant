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
import sounddevice
from dotenv import load_dotenv
from TTSSTT import FilteringTTS
import speech_recognition as sr
from pydub import AudioSegment
from langchain_openai import ChatOpenAI
from langchain.document_loaders import CSVLoader
from langchain.chains import LLMChain
from langchain_ollama import OllamaLLM
from langchain.chains import ConversationChain
from APIs import Server, response_text, userinput
from langchain.chains import RetrievalQA
from system_prompt import system_message
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory, ConversationSummaryBufferMemory

###APIs
threading.Thread(target=Server, daemon=True).start()
###LLMs
exitting_phrases = ["goodbye", "Goodbye", "bye", "Bye", "exit", "Exit", "leave", "Leave", "stop", "Stop", "quit", "Quit"]
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

system_message = system_message
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
def NanoEar():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Nano is Listening...")
        r.adjust_for_ambient_noise(source)
        while True:
            try:
                audio = r.listen(source)  # Listen in real-time
                text = r.recognize_google(audio)  # Convert to text
                print(f"You said: {text}")
                return text
            except sr.UnknownValueError:
                print("Could not understand.")
            except sr.RequestError:
                print("API unavailable.")

while True:

    text = NanoEar() #initializing the mic for nano
    emotionvar = random.choice(emotions)

    user_input = text
    # all the exitting phrases
    if user_input in exitting_phrases:
        FilteringTTS("Goodbye! See you soon :)", "BotAudio.wav")
        sound = AudioSegment.from_file("BotAudio.wav")
        play(sound)        
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