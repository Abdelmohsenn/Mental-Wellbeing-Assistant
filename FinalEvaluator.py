import openai
import os
import sys
import json
import pandas as pd
import numpy as np
import csv
import langchain_ollama
from langchain_ollama import OllamaLLM
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
# from bert_score import score
from dotenv import load_dotenv
from system_prompt import system_message

load_dotenv()
Key = os.getenv("OPENAI_API_KEY")

# Define LLMs
def LLMS():
    # GPT-4o
    llm = ChatOpenAI(model='gpt-4o', api_key=Key, temperature=0.8)

    # LLAMA
    llm2 = OllamaLLM(model="llama3.3")
    llm3 = OllamaLLM(model="llama3.2")

    # Deepseek
    llm4 = OllamaLLM(model="deepseek-r1:32b")

    # Emotion Classifier LW LLM (Gemma3)
    llm5 = OllamaLLM(model="vicuna:13b")
    llm6 = OllamaLLM(model="gemma3:4b")
    llm7 = OllamaLLM(model="gemma2:27b")
    llm8 = OllamaLLM(model="mistral:7b-instruct")

    return llm, llm2, llm3, llm4, llm5, llm6, llm7, llm8

# Load models
Gpt4o, Llama3_3, Llama3_2, Deepseek, Vicuna, Gemma3, Gemma2, Mistral7b_instruct = LLMS()

# Load the dataset
dataset = pd.read_csv("/home/group02-f24/Documents/Khalil/Datasets/AllDAIC/aligned_responses_filtered_Final.csv")
print(dataset.head())
print(dataset.shape)

shuffled_dataset = dataset.sample(frac=1, random_state=42).reset_index(drop=True)

# Take the first 10,000 rows after shuffling
inputs = shuffled_dataset['Input'].tolist()[:1000]
outputs = shuffled_dataset['Output'].tolist()[:1000]

# List of models and their names
models = {
    'Gpt4o': Gpt4o,
    'Llama3_3': Llama3_3,
    'Llama3_2': Llama3_2,
    'Deepseek': Deepseek,
    'Vicuna': Vicuna,
    'Gemma3': Gemma3,
    'Gemma2': Gemma2,
    'Mistral7b_instruct': Mistral7b_instruct
}
prompt = ChatPromptTemplate.from_messages([
    ("system", system_message),
    ("user", "{user_input}"),
])

# Iterate over the models
for model_name, model in models.items():
    output_file = ''
    print("Enter 1 for testing with System Prompt")
    print("Enter 0 for testing without System Prompt")
    choice = input()

    if choice == '1':
        output_file = f"{model_name}_results_withPrompt.csv"
        CHAIN = prompt | model
    elif choice == '0':
        output_file = f"{model_name}_results_withoutPrompt.csv"
        CHAIN = model

    with open(output_file, mode='w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=["Input", "Reference Output", "Precision", "Recall", "F1"])
        writer.writeheader()

    # Iterate over the inputs and outputs (first 10,000)
    for i in range(len(inputs)):
        input_text = inputs[i]
        output_text = outputs[i]

        # Call the model with the input text
        # response = CHAIN.invoke({"user_input": input_text})
        response = CHAIN.invoke( input_text)

        if model_name == 'Gpt4o': # different format
            response = response.content

        # Calculate Precision, Recall, and F1 score
        response_text = response.content if hasattr(response, "content") else response
        P, R, F1 = score([response_text], [output_text], lang="en", verbose=True)

        result_row = {
            'Input': input_text,
            'Reference Output': output_text,
            'Precision': P.mean().item(),
            'Recall': R.mean().item(),
            'F1': F1.mean().item()
        }

        # Append the row to the CSV file
        with open(output_file, mode='a', newline='') as file:
            writer = csv.DictWriter(file, fieldnames=["Input", "Reference Output", "Precision", "Recall", "F1"])
            writer.writerow(result_row)

        # Optional: print progress
        print(f"{model_name} | Sample {i+1}/{len(inputs)} written.")

    print(f"✅ Saved results for {model_name} to {output_file}")
