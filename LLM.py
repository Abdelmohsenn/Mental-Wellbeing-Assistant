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
from TTSSTT import FilteringTTS, STT, NanoEar
import speech_recognition as sr
from pydub import AudioSegment
from langchain_openai import ChatOpenAI
from langchain.document_loaders import CSVLoader, TextLoader, PyPDFLoader
from langchain.chains import LLMChain
from langchain_ollama import OllamaLLM
from langchain.chains import ConversationChain
from APIs import Server, response_text, userinput
from langchain.chains import RetrievalQA
from system_prompt import system_message
from langchain.vectorstores import Chroma, FAISS
from langchain.schema import Document
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory, ConversationSummaryBufferMemory
import pandas as pd

###APIs
threading.Thread(target=Server, daemon=True).start()
###LLMs
exitting_phrases = ["goodbye", "Goodbye", "bye", "Bye", "exit", "Exit", "leave", "Leave", "stop", "Stop", "quit", "Quit"]
load_dotenv()
# Get the API key from the .env file
Oapi_key = os.getenv("OPENAI_API_KEY")
embedding = OpenAIEmbeddings(api_key=Oapi_key, model="text-embedding-3-large")

# csvtest = "/Users/muhammadabdelmohsen/Desktop/University/Fall 24/Thesis 24:25/Work/TherapyDatasets/client_counselor_prompts_1000.csv"
csv = "/Users/muhammadabdelmohsen/Desktop/University/Spring 25/Thesis II/Datasets/aligned_responses_filtered.csv"
df = pd.read_csv(csv)
df = df.dropna()
df=df.drop(columns=['Unnamed: 2'])
df=df.drop(columns=['Unnamed: 3'])
df.columns = ['input', 'output']

print(df)

columninput=df['input'].tolist()
columnoutput=df['output'].tolist()

partition = [Document(page_content=row["input"], metadata={"response": row["output"]}) for _, row in df.iterrows()]
vectors = FAISS.from_documents(partition, embedding=embedding)

vectors.save_local("AlignedResponsesFiltered_RagDoc")
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

def retrieve_response(prompt):
    similar_docs = vectors.similarity_search(prompt, k=4)  # Get the most relevant match

    if similar_docs:
        return similar_docs[0].metadata["response"]
    else:
        return "I'm here to help, but I don't have an answer for that yet."

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
    retrievedText = retrieve_response(user_input)
    print(f"Common Replies:\n{retrievedText}")

    chat.prompt = updated_prompt
    response = chat.invoke({
    "input": f"{user_input}\n Common Replies: \n{retrievedText}"  # embed retrieved docs in input
})

        
    clean_response = re.sub(r"<think>.*?</think>\s*", "", response['text'], flags=re.DOTALL) # **only for O1 & deepsek R1**
    print(clean_response) 
    response_text['message'] = clean_response # hena bakhod el output ll api
    FilteringTTS(clean_response, "BotAudio.wav")
    sound = AudioSegment.from_file("BotAudio.wav")
    play(sound)