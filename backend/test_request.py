import requests

url = "http://127.0.0.1:8000/predict"

data = {
    "attendance": 0.75,
    "assignments": 0.6,
    "quizzes": 0.7
}

response = requests.post(url, json=data)
print(response.json())
