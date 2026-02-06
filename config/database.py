from pymongo import MongoClient

client = MongoClient("mongodb+srv://khaledhsabllah:30538890@cluster0.zkhr2oz.mongodb.net/?appName=Cluster0")

db = client.todo_db

collection_name = db ["todo_collection"]

