#!/usr/bin/env python3
"""
Project TRACE — Mock Data Generator for Machine Learning
Generates 500 mock documents and associated step_logs to train predictive bottleneck algorithms.
"""

import os
import random
from datetime import datetime, timedelta
import mysql.connector
from faker import Faker
from dotenv import load_dotenv

# Load env variables from backend/.env
env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
load_dotenv(env_path)

fake = Faker()

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'trace_db')
    )

def generate_mock_data(num_docs=500):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    print("Fetching clerks...")
    cursor.execute("SELECT id, full_name FROM users WHERE role = 'clerk'")
    clerks = cursor.fetchall()

    if not clerks:
        print("No clerks found in the database. Please seed the DB first.")
        return

    print(f"Generating {num_docs} mock documents and their step logs...")

    doc_types = ['Transcript of Records', 'Clearance', 'Certification', 'Diploma', 'Good Moral Certificate']
    statuses = ['approved', 'rejected']

    for i in range(num_docs):
        # 1. Create Document
        tracking_number = f"TRC-MOCK-{fake.hexify(text='^^^^^^^^', upper=True)}"
        student_id = f"{random.randint(2018, 2024)}-{random.randint(10000, 99999)}"
        doc_type = random.choice(doc_types)
        final_status = random.choice(statuses)
        clerk = random.choice(clerks)

        # Base timestamp from the last 12 months
        base_date = fake.date_time_between(start_date="-1y", end_date="now")
        
        cursor.execute(
            """INSERT INTO documents (tracking_number, student_id, student_name, document_type, current_status, assigned_clerk_id, created_at, updated_at) 
               VALUES (%s, %s, %s, %s, %s, NULL, %s, %s)""",
            (tracking_number, student_id, fake.name(), doc_type, final_status, base_date, base_date)
        )
        doc_id = cursor.lastrowid

        # 2. Step 1: Uploaded
        cursor.execute(
            """INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, timestamp_started, timestamp_completed, notes)
               VALUES (%s, NULL, 'submitted', NULL, 'submitted', %s, %s, 'Document uploaded by student')""",
            (doc_id, base_date, base_date)
        )

        # 3. Step 2: Auto-Routed (usually seconds after upload)
        route_time = base_date + timedelta(seconds=random.randint(5, 60))
        cursor.execute(
            """INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, timestamp_started, timestamp_completed, notes)
               VALUES (%s, NULL, 'routed', 'submitted', 'processing', %s, %s, 'Auto-routed by n8n')""",
            (doc_id, route_time, route_time)
        )

        # 4. Step 3: Clerk Processing
        # Introduce "Seasonal Bottleneck"
        # If month is May (Graduation season) or December, add significant delay
        delay_hours = random.randint(1, 48)
        if route_time.month in [5, 12]:
            delay_hours += random.randint(48, 168)  # Add 2-7 extra days of delay
        
        process_start = route_time + timedelta(minutes=random.randint(5, 120))
        process_end = process_start + timedelta(hours=delay_hours)

        cursor.execute(
            """INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, timestamp_started, timestamp_completed, notes)
               VALUES (%s, %s, %s, 'processing', %s, %s, %s, %s)""",
            (doc_id, clerk['id'], 'approve' if final_status == 'approved' else 'reject', final_status, process_start, process_end, f"Processed by {clerk['full_name']}")
        )

    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ Successfully injected {num_docs} documents and logs into the database.")

if __name__ == '__main__':
    generate_mock_data()
