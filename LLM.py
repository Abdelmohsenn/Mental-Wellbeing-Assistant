import re
import os
import ollama
import random
import uvicorn
import pyttsx3
import threading
from tqdm import tqdm
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
from langchain.chains import LLMChain, ConversationChain
from langchain_ollama import OllamaLLM, ChatOllama
from langchain.chains import ConversationChain
from APIs import Server, response_text, userinput
from langchain.chains import RetrievalQA
from langchain.chains import create_retrieval_chain
from system_prompt import system_message
from langchain.vectorstores import Chroma, FAISS
from langchain.schema import Document
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory, ConversationSummaryBufferMemory
import pandas as pd

## important initializations
load_dotenv()
# Get the API key from the .env file
Oapi_key = os.getenv("OPENAI_API_KEY")
embedding = OpenAIEmbeddings(api_key=Oapi_key, model="text-embedding-3-large")
embeddingADA = OpenAIEmbeddings(api_key=Oapi_key, model="text-embedding-ada-002")

# Classifier Prompt
Emoprompt = """Classify the emotion of the below expression by Providing one word response only from the following : Sadness, Happiness, Surprise, Anger, Neutral, Fear: \n Expression: {expression} """
Emoprompt = ChatPromptTemplate.from_template(Emoprompt)
### Different kind of memories
memory1 = ConversationBufferMemory(memory_key="history", return_messages=True)
memory2 = ConversationBufferWindowMemory(memory_key="history", return_messages=True, k = 8)
# memory3 = ConversationSummaryBufferMemory(memory_key="history", return_messages=True, max_token_limit=2000,llm=llm)
memories = {}
backgrounds = {}

# user id below from the database   
UserID = 1 # default 1
backgrounds[UserID] = "This user is triggered by his childhood memories"


#Main Prompt
prompt = ChatPromptTemplate([
    ("system", system_message),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),  
])

# RAG Database for the dataset Aligned Responses
def RAG(csv):
    vectors = None  
    df = pd.read_csv(csv, usecols=[0, 1])
    df = df.dropna()
    df.columns = ['input', 'output']
    print(df.shape)  # Show number of rows and columns
    print(df.head(10))  # Show first 10 rows
    print(df.dtypes)  # Show column types

    batch_size = 10000
    num_rows = len(df)  
    num_batches = (num_rows + batch_size - 1) // batch_size  
    partition = [
        Document(page_content=row["input"], metadata={"response": row["output"]})
        for _, row in df.iterrows()
    ]
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=200)
    split_docs = text_splitter.split_documents(partition)

    for i in range(num_batches):
        StartIndex = i * batch_size
        end_idx = min((i + 1) * batch_size, num_rows)  
        batch_docs = split_docs[StartIndex:end_idx] 
        
        print(f"Embedding rows {StartIndex} to {end_idx}...")
        batch_vectors = FAISS.from_documents(batch_docs, embedding=embeddingADA)  
        if vectors is None:
            vectors = batch_vectors
        else:
            vectors.merge_from(batch_vectors)
        print(f"Batch {i+1} completed ✅ (Rows {StartIndex} to {end_idx})")
    vectors.save_local("AlignedResponsesFiltered_RagDocADA") # save the index to load it later
    exit(1)

def LoadVectors():
    vectors = FAISS.load_local("RAG_Vectors/AlignedResponsesFiltered_RagFAISS", embeddings=embedding, allow_dangerous_deserialization=True) # loading the faiss index
    return vectors
    
def LLMS():
    #GPT-4o
    llm = ChatOpenAI(model='gpt-4o', api_key=Oapi_key, temperature=0.8) # the higher the temperature, the more creative the response
    llm2 = ChatOpenAI(model='gpt-4o', api_key=Oapi_key, temperature=0.5) # the lower the temperature, the more conservative the response
    #LLAMA
    llm3 = OllamaLLM(model="llama3.3")
    llm4 = OllamaLLM(model="llama3.2")
    #Deepseek
    llm5 = OllamaLLM(model="deepseek-r1:32b")
    # Emotion Classifier LW LLM (Gemma3)
    EmoLLM = OllamaLLM(model = "gemma3")

    return llm,llm2,llm3,llm4,llm5,EmoLLM

# RAG Retrieval
def retrieve_response(prompt):
    ConcatenatedResponses = ""
    count = 0
    similar_docs = vectors.similarity_search(prompt, k=2)  # Get the most relevant match
    for doc in similar_docs:
        print(f"Retrieved Document: {doc.page_content} -> {doc.metadata['response']}")

    if similar_docs:
        for i in similar_docs:
            count=count+1
            ConcatenatedResponses = ConcatenatedResponses + str(count) + " " + i.metadata['response'] + "\n"
        return ConcatenatedResponses
    else:
        return "I'm here to help, but I don't have an answer for that yet."

def retrieve_userBackground(userId):
    background=backgrounds[userId]
    return background

# Main Chain
def GetChain(systemPrompt, llm, userId, memoryType):
    memories[userId] = memoryType
    memory = memories[userId]
    chat = ConversationChain(
        llm=llm,
        memory=memory,
        prompt=systemPrompt,
        verbose=True,    
    )
    return chat

def Run(user_input, EMoChain, system_message, chat):

    Emotion = EMoChain.invoke({"expression":user_input})
    retrievedText = retrieve_response(user_input)
    retrievedBackground = retrieve_userBackground(UserID)

    # all the exitting phrases
    if user_input in exitting_phrases:
        FilteringTTS("Goodbye! See you soon :)", "BotAudio.wav")
        sound = AudioSegment.from_file("BotAudio.wav")
        play(sound)        
        exit(1)

    updated_system_message = f"""
    {system_message}\n(Important Note: The user's current emotion is {Emotion.strip()}).\n
    \n###User's Background:\n{retrievedBackground}\n\n### Provided Similar Therapy Responses: \n{retrievedText} \n """ # update the emotion for every prompt

    updated_prompt = ChatPromptTemplate.from_messages([
        ("system", updated_system_message),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    chat.prompt = updated_prompt
    response = chat.invoke({
    "input": f"{user_input}\n"  # embed retrieved docs in input
})
     
    clean_response = re.sub(r"<think>.*?</think>\s*", "", response['response'], flags=re.DOTALL) # **only for O1 & deepsek R1**
    # print(response) 
    # print(retrievedText)
    response_text['message'] = clean_response # hena bakhod el output ll api
    print(clean_response)
    FilteringTTS(clean_response, "BotAudio.wav")
    sound = AudioSegment.from_file("BotAudio.wav")
    play(sound)
    return clean_response

threading.Thread(target=Server, daemon=True).start()
exitting_phrases = ["goodbye", "Goodbye", "bye", "Bye", "exit", "Exit", "leave", "Leave", "stop", "Stop", "quit", "Quit"]

# RAG("/home/group02-f24/Documents/Khalil/Datasets/AllDAIC/aligned_responses_filtered.csv") # loading the RAG database
vectors = LoadVectors()
# print(f"FAISS index dimension: {vectors.index.d}")
# query_vector = embedding.embed_query("hello")  # Any sample text
# print(f"Query vector dimension: {len(query_vector)}")

# All LLMS
MainLLM, llm2, llm3, llm4, llm5, EmoLLM = LLMS()

chat = GetChain(systemPrompt=prompt, llm= MainLLM, userId=UserID, memoryType=memory1) #now every user has his own chat chain

## Classifier Chain
EMoChain = Emoprompt | EmoLLM
# response = Run(user_input=text,EMoChain=EMoChain, system_message = system_message, chat=chat) # uncomment this for default calling
while True:
    counter=0
    choice = '1'
    while(counter!=1):
        if choice == '1':
            text = input("Enter your Prompt >> ")
            Run(user_input=text,EMoChain=EMoChain, system_message = system_message, chat=chat)
            counter=1
        elif choice == '2':     
            text = NanoEar() #initializing the mic for nano
            Run(user_input=text,EMoChain=EMoChain, system_message = system_message, chat=chat)
            counter=1
        else:
            print("Invalid choice, Please Re-enter")
            choice = input("Enter 1 for Text or 2 for Voice: ")
