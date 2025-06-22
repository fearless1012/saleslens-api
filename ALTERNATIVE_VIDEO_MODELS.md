# Alternative Text-to-Video Models for SalesLens

## Current Status

The system currently uses Stable Video Diffusion but experiences authentication issues with HuggingFace. Here are open source alternatives that can be integrated.

## 🎬 Open Source Text-to-Video Models

### 1. **AnimateDiff** ⭐ RECOMMENDED

- **Repository**: https://github.com/guoyww/AnimateDiff
- **License**: Apache 2.0 (Commercial friendly)
- **Type**: Diffusion-based animation
- **Strengths**:
  - Excellent for training content
  - Good motion control
  - Works with existing Stable Diffusion models
  - Active community
- **Integration**: Can be run locally or via API
- **Hardware**: GPU recommended (4-8GB VRAM)

### 2. **Text2Video-Zero**

- **Repository**: https://github.com/Picsart-AI-Research/Text2Video-Zero
- **License**: CreativeML Open RAIL-M
- **Type**: Zero-shot video generation
- **Strengths**:
  - No training required
  - Works with any Stable Diffusion model
  - Good for presentation-style videos
- **Hardware**: GPU recommended (6GB+ VRAM)

### 3. **VideoFusion**

- **Repository**: https://github.com/modelscope/modelscope
- **License**: Apache 2.0
- **Type**: Diffusion-based video synthesis
- **Strengths**:
  - High quality output
  - Good temporal consistency
  - Chinese tech stack (Alibaba)
- **Hardware**: GPU required (8GB+ VRAM)

### 4. **Zeroscope**

- **Repository**: https://huggingface.co/cerspense/zeroscope_v2_576w
- **License**: CreativeML Open RAIL-M
- **Type**: Video diffusion model
- **Strengths**:
  - Available on HuggingFace
  - Good for short clips
  - Relatively fast
- **Hardware**: GPU recommended (4-6GB VRAM)

### 5. **LaVie** (Latent Video Diffusion)

- **Repository**: https://github.com/Vchitect/LaVie
- **License**: Apache 2.0
- **Type**: Latent diffusion for video
- **Strengths**:
  - High quality results
  - Good for longer videos
  - Academic backing
- **Hardware**: GPU required (8GB+ VRAM)

### 6. **Open-Sora** ⭐ PROMISING

- **Repository**: https://github.com/hpcaitech/Open-Sora
- **License**: Apache 2.0
- **Type**: Open source Sora-like model
- **Strengths**:
  - Inspired by OpenAI's Sora
  - Very active development
  - Good documentation
  - Commercial friendly license
- **Hardware**: High-end GPU (16GB+ VRAM)

## 🛠️ Lightweight Alternatives for Training Videos

### 7. **Simple Slideshow Generator**

- **Type**: Image sequence to video
- **Tools**: FFmpeg + Python
- **Strengths**:
  - Very fast
  - No GPU required
  - Perfect for training presentations
  - Reliable
- **Use Case**: Convert generated images to slideshow videos

### 8. **Manim (Mathematical Animation)**

- **Repository**: https://github.com/ManimCommunity/manim
- **License**: MIT
- **Type**: Programmatic animation
- **Strengths**:
  - Perfect for educational content
  - Text animations
  - Charts and diagrams
- **Hardware**: CPU only

## 🔥 Recommended Implementation Strategy

### Phase 1: Quick Fix (Immediate)

```bash
# Use FFmpeg for slideshow videos
ffmpeg -framerate 1/3 -i image_%d.png -c:v libx264 -r 30 -pix_fmt yuv420p output.mp4
```

### Phase 2: AnimateDiff Integration (1-2 weeks)

- Local installation
- API wrapper
- Batch processing

### Phase 3: Open-Sora (Future)

- When more stable
- Higher quality output

## 🔧 Implementation Options

### Option A: Local AnimateDiff Setup

```python
# Python API wrapper for AnimateDiff
import torch
from animatediff.pipelines import animation_pipeline

def generate_training_video(prompt, duration=10):
    pipe = animation_pipeline.load_model()
    video = pipe(prompt, num_frames=duration*8)
    return video
```

### Option B: ModelScope Integration

```python
# Using ModelScope's video models
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks

pipe = pipeline(Tasks.text_to_video_synthesis,
                'damo/text-to-video-synthesis')
result = pipe({'text': prompt})
```

### Option C: Zeroscope via HuggingFace

```python
# Alternative HuggingFace model
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained(
    "cerspense/zeroscope_v2_576w",
    torch_dtype=torch.float16
)
video = pipe(prompt).frames
```

## 📊 Comparison Matrix

| Model           | License    | GPU Req  | Speed      | Quality    | Training Content |
| --------------- | ---------- | -------- | ---------- | ---------- | ---------------- |
| AnimateDiff     | Apache 2.0 | ✅ 4-8GB | ⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐       |
| Text2Video-Zero | CreativeML | ✅ 6GB+  | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐⭐         |
| Open-Sora       | Apache 2.0 | ❌ 16GB+ | ⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐         |
| Zeroscope       | CreativeML | ✅ 4-6GB | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐           |
| FFmpeg Slides   | MIT        | ❌ CPU   | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐⭐⭐       |

## 💡 Immediate Solution

For training videos specifically, I recommend starting with a **hybrid approach**:

1. **Primary**: FFmpeg slideshow generation (reliable, fast)
2. **Secondary**: AnimateDiff for enhanced videos (when GPU available)
3. **Fallback**: Static image with audio overlay

This ensures the system always works while providing upgrade paths for better quality.

## 🚀 Next Steps

1. Implement FFmpeg slideshow generator
2. Set up AnimateDiff local installation
3. Create model selection API
4. Add video quality settings
5. Monitor Open-Sora development

Would you like me to implement any of these alternatives?
