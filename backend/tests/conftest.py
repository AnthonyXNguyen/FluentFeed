import os

# config.py reads these at import time; tests never call Azure.
os.environ.setdefault("AZURE_SPEECH_KEY", "test-key")
os.environ.setdefault("AZURE_SPEECH_REGION", "test-region")
