"""Offline image acceptance: real CPU OCR, Prophet and gateway enforcement."""
import os
import importlib.util
import tempfile
from datetime import date, timedelta
from pathlib import Path
from PIL import Image, ImageDraw
import torch
import torchvision
from app import app
from ocr_engine import process_document
from forecaster import predict_counts
assert os.getuid() != 0, 'AI must run without root'
assert importlib.util.find_spec('pip') is None, 'Runtime must not contain a package installer'
assert torch.version.cuda is None, 'CPU-only PyTorch is required'
with app.test_client() as client:
    assert client.get('/health').status_code == 200
    assert client.post('/forecast', json={}).status_code == 401
with tempfile.TemporaryDirectory() as folder:
    image = Image.new('RGB', (1200, 300), 'white')
    ImageDraw.Draw(image).text((30, 70), 'STUDENT ID 99-00001 TRANSCRIPT', fill='black', font_size=48)
    path = Path(folder) / 'synthetic.png'; image.save(path)
    result = process_document(str(path)); assert result['success'], 'Synthetic OCR failed'
history = [{'date': (date(2025, 1, 1) + timedelta(days=n)).isoformat(), 'volume': 10 + n % 7} for n in range(35)]
dates = [(date(2025, 2, 5) + timedelta(days=n)).isoformat() for n in range(7)]
assert len(predict_counts(history, dates)) == 7
print('Non-root CPU OCR, gateway and seven-day Prophet smoke passed.')
