import os
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
import openai

router = APIRouter(prefix="/chat", tags=["AI Customer Support"])

class ChatRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    message: str

class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    reply: str

@router.post("/", response_model=ChatResponse)
async def chat_with_erp(req: ChatRequest):
    """
    AI Chatbot for customer queries. Connects to OpenAI API.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    if api_key and api_key != "your_openai_api_key_here":
        try:
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful customer support AI for TrackBells Manufacturing, a drag chain factory. Keep answers short and polite."},
                    {"role": "user", "content": req.message}
                ]
            )
            return ChatResponse(reply=response.choices[0].message.content)
        except Exception as e:
            return ChatResponse(reply=f"OpenAI Error: {str(e)}")
    else:
        # Fallback keyword logic
        msg = req.message.lower()
        if "stock" in msg or "inventory" in msg:
            reply = "We currently have over 5,000 meters of open-series chains in stock. Please check the portal for exact Model quantities."
        elif "order" in msg or "status" in msg:
            reply = "To check your order status, please navigate to the Orders tab. Most orders dispatch within 48 hours!"
        else:
            reply = "Hello! I am the TrackBells Assistant. (Running in Mock Mode. Please add OPENAI_API_KEY for dynamic conversations)."
            
        return ChatResponse(reply=reply)
