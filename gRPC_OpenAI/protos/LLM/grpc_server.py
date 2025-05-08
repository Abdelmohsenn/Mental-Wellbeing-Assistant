import grpc
from concurrent import futures
import time
import re
import os
import llm_pb2
import llm_pb2_grpc
from LLM import generate_response, initiate_session, end_session

class LLMService(llm_pb2_grpc.LLMServiceServicer):
    def Chat(self, request, context):
        try:
            user_input = request.message
            user_id = request.user_id
            session_id = request.session_id
            #print(f"🟡 Received message: {user_input} from User: {user_id}")
            reply = generate_response(user_input, session_id, user_id)
            #print(f"🟢 Sending reply: {reply}")
            return llm_pb2.Response(message=reply)
        except Exception as e:
            print("❌ Exception occurred in Chat method")
            import traceback
            traceback.print_exc()
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.INTERNAL)
            return llm_pb2.Response(message="Error occurred.")
    
    def InitiateSession(self, request, context):
        try:
            sessionID = request.session_id
            background = request.user_backg
            userID = request.user_id
            print(f"🟡 Received session request: {sessionID} with backg: {background}")
            result = initiate_session(sessionID, background, userID)
            print(f"🟢 Sending init result: {result}")
            return llm_pb2.MemStatus(status=result)
        except Exception as e:
            print("❌ Exception occurred in Chat method")
            import traceback
            traceback.print_exc()
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.INTERNAL)
            return llm_pb2.MemStatus(status=False)
        
    def EndSession(self, request, context):
        try:
            sessionID = request.session_id
            print(f"🟡 Received end session request: {sessionID}")
            result = end_session(sessionID)
            print(f"🟢 Sending end result: {result}")
            return llm_pb2.MemStatus(status=result)
        except Exception as e:
            print("❌ Exception occurred in Chat method")
            import traceback
            traceback.print_exc()
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.INTERNAL)
            return llm_pb2.MemStatus(status=False)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    llm_pb2_grpc.add_LLMServiceServicer_to_server(LLMService(), server)

    server.add_insecure_port('[::]:50056')
    print("gRPC Server is running on port 50056...")
    server.start()
    try:
        while True:
            time.sleep(86400)  # One day
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == '__main__':
    serve()
