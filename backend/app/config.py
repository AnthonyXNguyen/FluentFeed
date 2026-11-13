import os

from dotenv import load_dotenv

load_dotenv()

AZURE_SPEECH_KEY = os.environ["AZURE_SPEECH_KEY"]
AZURE_SPEECH_REGION = os.environ["AZURE_SPEECH_REGION"]
# Same project URL as the app's EXPO_PUBLIC_SUPABASE_URL; used to verify logins.
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
