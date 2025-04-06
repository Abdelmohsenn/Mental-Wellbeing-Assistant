import grpc
from concurrent import futures
import time
import re
import os
import llm_pb2
import llm_pb2_grpc
from LLM import generate_response
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

class LLMService(llm_pb2_grpc.LLMServiceServicer):
    def GetResponse(self, request, context):
        user_input = request.message
        reply = generate_response(user_input)
        return llm_pb2.LLMResponse(reply=reply)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    llm_pb2_grpc.add_LLMServiceServicer_to_server(LLMService(), server)

    server.add_insecure_port('[::]:50051')
    print("gRPC Server is running on port 50051...")
    server.start()
    try:
        while True:
            time.sleep(86400)  # One day
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == '__main__':
    serve()
