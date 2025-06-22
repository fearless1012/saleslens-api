# 🚀 Local AI Services Setup Guide

This guide shows how to set up Stable Diffusion and Bark locally for completely free multimedia generation.

## 🎨 Stable Diffusion Local Setup

### Option A: AUTOMATIC1111 WebUI (Recommended)

```bash
# Clone the repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Install and run (will auto-download models)
./webui.sh --api --listen --port 7860

# Access at: http://localhost:7860
```

### Option B: ComfyUI (Advanced)

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
python main.py --listen --port 7860
```

## 🎵 Bark Audio Local Setup

### Python Installation

```bash
# Create virtual environment
python -m venv bark_env
source bark_env/bin/activate  # On Windows: bark_env\Scripts\activate

# Install Bark
pip install git+https://github.com/suno-ai/bark.git

# Create simple API server
cat > bark_server.py << EOF
from flask import Flask, request, jsonify, send_file
from bark import SAMPLE_RATE, generate_audio, preload_models
import scipy.io.wavfile as wavfile
import tempfile
import os

app = Flask(__name__)
preload_models()

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    text = data.get('inputs', '')
    voice_preset = data.get('parameters', {}).get('voice_preset', 'v2/en_speaker_6')

    audio_array = generate_audio(text, history_prompt=voice_preset)

    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    wavfile.write(temp_file.name, SAMPLE_RATE, audio_array)

    return send_file(temp_file.name, as_attachment=True, mimetype='audio/wav')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
EOF

# Run the server
python bark_server.py
```

## 🔧 Update Environment Variables

After setting up local services, update your `.env`:

```env
# Use local services instead of cloud APIs
HUGGING_FACE_TOKEN=local_setup
STABLE_DIFFUSION_LOCAL_URL=http://localhost:7860
BARK_LOCAL_URL=http://localhost:8080
PYTHON_PATH=/path/to/your/bark_env/bin/python
```

## 📊 Verify Setup

Test your local setup:

```bash
# Test Stable Diffusion API
curl -X POST http://localhost:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test image", "steps": 20}'

# Test Bark API
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Hello world", "parameters": {"voice_preset": "v2/en_speaker_6"}}'
```

## 🎯 Benefits of Local Setup

✅ **Completely Free** - No API costs
✅ **Private** - Data stays on your machine  
✅ **Unlimited Usage** - No rate limits
✅ **Offline Capable** - Works without internet
✅ **Customizable** - Use custom models and voices

## 🚀 Production Deployment

For production, consider:

- GPU acceleration for faster generation
- Docker containers for easy deployment
- Load balancing for multiple instances
- Caching for frequently requested content
