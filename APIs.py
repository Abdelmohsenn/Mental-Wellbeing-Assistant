from fastapi import FastAPI
import uvicorn

app = FastAPI()
response_text = {"message": "No response yet"}  # Store response globally
userinput = {"message": "No response yet"}  # Store response globally

@app.get("/response")
async def resreturn():
    return response_text  

@app.get("/userinput")
async def resreturn():
    return userinput  

def Server():
    """Runs FastAPI in a separate thread."""
    uvicorn.run(app, host="127.0.0.1", port=8080)

    