import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def ask_jarvis(prompt: str):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "mistral",
            "prompt": prompt,
            "stream": False
        },
        timeout=60
    )

    data = response.json()
    return data["response"]
