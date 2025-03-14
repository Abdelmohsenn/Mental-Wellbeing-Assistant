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

vectors = None  
# RAG Database for the dataset Aligned Responses
def RAG(csv):

    df = pd.read_csv(csv)
    df.columns = ['input', 'output']
    df = df.dropna()
    print(df.shape)  # Show number of rows and columns
    print(df.head(10))  # Show first 10 rows
    print(df.dtypes)  # Show column types

    columninput=df['input'].tolist()
    columnoutput=df['output'].tolist()
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
        batch_vectors = FAISS.from_documents(batch_docs, embedding=embedding)  
        if vectors is None:
            vectors = batch_vectors
        else:
            vectors.merge_from(batch_vectors)
        print(f"Batch {i+1} completed ✅ (Rows {StartIndex} to {end_idx})")
    vectors.save_local("AlignedResponsesFiltered_RagDoc") # save the index to load it later

# RAG Retrieval
def retrieve_response(prompt):
    ConcatenatedResponses = ""
    similar_docs = vectors.similarity_search(prompt, k=4)  # Get the most relevant match
    for doc in similar_docs:
        print(f"Retrieved Document: {doc.page_content} -> {doc.metadata['response']}")

    if similar_docs:
        for i in similar_docs:
            ConcatenatedResponses = ConcatenatedResponses + i.metadata['response'] + "\n"
        return ConcatenatedResponses
    else:
        return "I'm here to help, but I don't have an answer for that yet."

###APIs
threading.Thread(target=Server, daemon=True).start()
###LLMs
exitting_phrases = ["goodbye", "Goodbye", "bye", "Bye", "exit", "Exit", "leave", "Leave", "stop", "Stop", "quit", "Quit"]
load_dotenv()
# Get the API key from the .env file
Oapi_key = os.getenv("OPENAI_API_KEY")
embedding = OpenAIEmbeddings(api_key=Oapi_key, model="text-embedding-3-large")


vectors = FAISS.load_local("AlignedResponsesFiltered_RagDoc", embeddings=embedding, allow_dangerous_deserialization=True) # loading the faiss index

#GPT-4o
llm = ChatOpenAI(model='gpt-4o', api_key=Oapi_key, temperature=0.8) # the higher the temperature, the more creative the response
llm2 = ChatOpenAI(model='gpt-4o', api_key=Oapi_key, temperature=0.5) # the lower the temperature, the more conservative the response

#LLAMA
llm3 = OllamaLLM(model="llama3.3")
llm4 = OllamaLLM(model="llama3.2")
print(f"FAISS index dimension: {vectors.index.d}")
query_vector = embedding.embed_query("hello")  # Any sample text
print(f"Query vector dimension: {len(query_vector)}")

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
memory1 = ConversationBufferMemory(memory_key="history", return_messages=True)
memory2 = ConversationBufferWindowMemory(memory_key="history", return_messages=True, k = 8)
# memory3 = ConversationSummaryBufferMemory(memory_key="history", return_messages=True, max_token_limit=2000,llm=llm)

chat = LLMChain(
    llm=llm,
    memory=memory1,
    prompt=prompt,
    verbose=True
)
# Main While loop for Chatting via voice
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
    "input": f"{user_input}\n **Common Therapists Replies that are related:** \n{retrievedText}"  # embed retrieved docs in input
})
     
    clean_response = re.sub(r"<think>.*?</think>\s*", "", response['text'], flags=re.DOTALL) # **only for O1 & deepsek R1**
    print(clean_response) 
    print(retrievedText)
    response_text['message'] = clean_response # hena bakhod el output ll api
    FilteringTTS(clean_response, "BotAudio.wav")
    sound = AudioSegment.from_file("BotAudio.wav")
    play(sound)