# Video Generation Implementation Guide

## Overview

This implementation enables real video generation for training modules in the SalesLens system. Videos are created using Stable Video Diffusion and integrated into multimedia training packages.

## 🎬 What's Been Implemented

### 1. **Real Video Generation**

- **Stable Video Diffusion Integration**: Uses HuggingFace API for video generation
- **Local API Support**: Fallback to local Stable Diffusion installations
- **Image Sequence Alternative**: Creates video-like content from image sequences
- **Enhanced Placeholders**: Detailed metadata when generation fails

### 2. **Configuration Changes**

- **Videos Enabled by Default**: `includeVideos: true` in all configurations
- **Flexible Resolution**: Support for 720p and 1080p output
- **Quality Options**: Fast, standard, and high quality modes

### 3. **Robust Fallback System**

- **Primary**: HuggingFace Stable Video Diffusion
- **Secondary**: Local API (if available)
- **Tertiary**: Image sequence videos
- **Final**: Enhanced placeholders with metadata

### 4. **Testing & Validation**

- **Test Endpoint**: `/api/multimedia-training/test-video-generation`
- **Test Script**: `npm run test-video-generation`
- **Status Monitoring**: Real-time capability detection

## 🚀 How to Use

### Basic Usage

```javascript
const result = await multimediaService.generateMultimediaTrainingModule(
  domainKnowledge,
  userId,
  {
    includeImages: true,
    includeAudio: true,
    includeVideos: true, // ✅ Now enabled
    videoResolution: "1080p",
    // ... other options
  }
);
```

### Test Video Generation

```bash
# Test video functionality
npm run test-video-generation

# Test full multimedia with videos
npm run test-multimedia-generation

# Quick test (videos only)
curl -X POST http://localhost:3001/api/multimedia-training/test-video-generation
```

## 🔧 Configuration Requirements

### Environment Variables

```bash
# Required for HuggingFace video generation
HUGGING_FACE_TOKEN=hf_your_token_here

# Optional for local installations
STABLE_DIFFUSION_LOCAL_URL=http://localhost:7860
```

### Video Generation Options

```typescript
interface MediaGenerationOptions {
  includeVideos: boolean; // Enable video generation
  videoResolution: "720p" | "1080p"; // Output resolution
  // ... other options
}
```

## 📁 File Output

Videos are saved to:

```
media_output/
└── videos/
    ├── sd_video_[timestamp].mp4           # Real videos
    ├── enhanced_placeholder_[timestamp].json  # Enhanced placeholders
    └── image_sequence_video_[timestamp].json  # Image sequences
```

## 🎯 Video Generation Flow

1. **Validation**: Check request parameters
2. **HuggingFace**: Attempt Stable Video Diffusion via API
3. **Local Fallback**: Try local Stable Diffusion if available
4. **Image Sequence**: Create video from image series
5. **Placeholder**: Generate detailed metadata file

## 🔍 Status Monitoring

```typescript
// Check video generation capabilities
const status = multimediaService.getVideoGenerationStatus();

// Test video generation
const testResult = await multimediaService.testVideoGeneration();
```

## ⚡ Performance Notes

- **Generation Time**: 30-120 seconds per video
- **File Sizes**: 5-50MB depending on resolution and length
- **API Limits**: HuggingFace has rate limits and usage costs
- **Fallbacks**: System gracefully degrades when services unavailable

## 🎨 Customization

### Video Prompts

Videos are generated with prompts like:

```
"Professional training presentation video for '[lesson_title]'.
Educational content about [lesson_content_preview]..."
```

### Technical Parameters

- **Frames**: 10-25 frames per video
- **FPS**: 6-8 frames per second
- **Duration**: ~2-4 seconds per video
- **Format**: MP4 (when successful)

## 🚨 Error Handling

The system handles various failure scenarios:

1. **API Unavailable**: Falls back to local generation
2. **Model Loading**: Returns enhanced placeholder with retry info
3. **Rate Limits**: Queues requests and retries
4. **Invalid Requests**: Validates and corrects parameters

## 🔮 Future Enhancements

### Planned Features

- **Audio-Video Sync**: Combine narration with visuals
- **Video Transitions**: Smooth animations between slides
- **Interactive Elements**: Clickable video components
- **Batch Processing**: Parallel video generation
- **Quality Validation**: Automatic video quality checks

### Technical Improvements

- **FFmpeg Integration**: Better video processing
- **Caching System**: Reuse similar videos
- **Progressive Loading**: Stream videos as they generate
- **Analytics**: Track video generation metrics

## 📚 API Reference

### Generate Video

```http
POST /api/multimedia-training/generate-multimedia-module
{
  "domainKnowledge": "...",
  "userId": "user-id",
  "includeVideos": true,
  "videoResolution": "1080p"
}
```

### Test Video Generation

```http
POST /api/multimedia-training/test-video-generation
```

### Response Format

```json
{
  "success": true,
  "module": {
    /* training module */
  },
  "filePaths": {
    "videos": ["path1.mp4", "path2.json"]
  }
}
```

## 🎉 Success Criteria

Video generation is working when:

- ✅ `includeVideos: true` generates actual video files
- ✅ HuggingFace API returns MP4 videos
- ✅ Fallbacks work when primary methods fail
- ✅ Test scripts complete successfully
- ✅ Videos are saved to filesystem and database

Run `npm run test-video-generation` to verify all functionality!
