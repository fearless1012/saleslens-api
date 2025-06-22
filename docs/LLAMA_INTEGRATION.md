# SalesLens LLaMA Integration

This document provides comprehensive information about the LLaMA integration in the SalesLens application, including setup, usage, and customization.

## Overview

The LLaMA integration enables AI-powered analysis and processing of uploaded files using Meta's LLaMA models with customizable Jinja2-based prompt templates.

### Key Features

- **Multi-Model Support**: Support for various LLaMA models (3.3-70B, 3.1-405B, etc.)
- **Jinja2 Templating**: Flexible prompt templates with variables and filters
- **File Processing**: Extract content from PDFs, Word docs, text files, and more
- **Streaming Responses**: Real-time streaming for better user experience
- **Template Management**: Create, edit, and manage custom prompt templates
- **Context-Aware**: Automatically build context from database records
- **Type Safety**: Full TypeScript support with comprehensive interfaces

## Installation & Setup

### 1. Install Dependencies

The required dependencies should already be installed, but if needed:

```bash
cd saleslens-api
npm install axios nunjucks fs-extra pdf-parse mammoth @types/nunjucks @types/fs-extra @types/pdf-parse
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and add your LLaMA API key:

```env
# LLaMA API Configuration
LLAMA_API_KEY=your_actual_llama_api_key_here
LLAMA_BASE_URL=https://api.llama.com/v1/chat/completions
```

### 3. API Key Setup

To get your LLaMA API key:

1. Visit [LLaMA Developer Portal](https://llama.developer.meta.com/docs/sdks/)
2. Sign up or log in to your Meta Developer account
3. Create a new application
4. Generate an API key
5. Add the key to your `.env` file

## Architecture

### Service Layer

1. **LLaMAService** (`src/services/llamaService.ts`)

   - Direct API communication with LLaMA endpoints
   - Request/response handling
   - Error management and retry logic

2. **PromptTemplateEngine** (`src/services/promptTemplateService.ts`)

   - Jinja2-like template rendering using Nunjucks
   - Template management (CRUD operations)
   - Context validation and variable substitution

3. **FileProcessorService** (`src/services/fileProcessorService.ts`)

   - Multi-format file content extraction
   - Text processing and cleaning
   - Processing estimates and metadata

4. **LLaMAIntegrationService** (`src/services/llamaIntegrationService.ts`)
   - Unified service combining all capabilities
   - Context building from database records
   - Request orchestration and response handling

### API Routes

All LLaMA endpoints are available under `/api/llama/`:

- `POST /api/llama/process` - Process requests with templates
- `POST /api/llama/process/stream` - Streaming responses
- `GET /api/llama/templates` - List all templates
- `POST /api/llama/templates` - Create new template
- `PUT /api/llama/templates/:name` - Update template
- `DELETE /api/llama/templates/:name` - Delete template
- `POST /api/llama/suggest-template` - AI-powered template suggestions
- `GET /api/llama/status` - Health check and configuration validation

## Usage Examples

### 1. Basic File Analysis

```typescript
// Analyze a sales pitch
const response = await fetch("/api/llama/process", {
  method: "POST",
  headers: {
    Authorization: "Bearer your_jwt_token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    templateName: "sales_pitch_analysis",
    pitchId: "64a1b2c3d4e5f6789012345",
    options: {
      model: "llama-3.3-70b-instruct",
      maxTokens: 1500,
      temperature: 0.3,
    },
  }),
});

const result = await response.json();
console.log(result.data.response);
```

### 2. Streaming Response

```typescript
// Set up streaming for real-time responses
const eventSource = new EventSource("/api/llama/process/stream", {
  method: "POST",
  headers: {
    Authorization: "Bearer your_jwt_token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    templateName: "document_summarization",
    fileId: "64a1b2c3d4e5f6789012345",
  }),
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "start":
      console.log("Processing started...");
      break;
    case "chunk":
      console.log("Received:", data.content);
      break;
    case "complete":
      console.log("Final result:", data.result);
      eventSource.close();
      break;
    case "error":
      console.error("Error:", data.message);
      eventSource.close();
      break;
  }
};
```

### 3. Custom Template Creation

```typescript
// Create a custom prompt template
const customTemplate = {
  name: "competitive_analysis",
  description: "Analyze competitive positioning from sales materials",
  category: "analysis",
  systemPrompt: `You are a competitive intelligence expert specializing in market analysis and competitive positioning.`,
  userPrompt: `Analyze this sales material for competitive insights:

**Document:** {{ file.title }}
**Content:** {{ file.content | truncate(2000) }}

{% if pitch %}
**Industry:** {{ pitch.industry }}
**Category:** {{ pitch.category }}
{% endif %}

Provide:
1. **Competitive Mentions**: Direct and indirect competitor references
2. **Positioning Strategy**: How the offering is positioned vs competitors  
3. **Differentiation Points**: Key differentiators highlighted
4. **Market Gaps**: Opportunities not addressed by competitors
5. **Competitive Threats**: Potential weaknesses vs competition`,
  variables: ["file", "pitch"],
  model: "llama-3.3-70b-instruct",
  maxTokens: 1200,
  temperature: 0.4,
};

await fetch("/api/llama/templates", {
  method: "POST",
  headers: {
    Authorization: "Bearer your_jwt_token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(customTemplate),
});
```

## Prompt Templates

### Template Structure

Templates are JSON files stored in `src/templates/prompts/` with the following structure:

```json
{
  "name": "template_name",
  "description": "Template description",
  "category": "analysis|generation|extraction|summarization|classification|custom",
  "systemPrompt": "System instructions for the AI",
  "userPrompt": "User prompt with Jinja2 variables: {{ variable }}",
  "variables": ["file", "pitch", "customer"],
  "model": "llama-3.3-70b-instruct",
  "maxTokens": 1000,
  "temperature": 0.7,
  "examples": [
    {
      "input": { "file": { "title": "Example", "content": "..." } },
      "expectedOutput": "Expected response format"
    }
  ]
}
```

### Available Variables

Templates can access the following context variables:

- **`file`**: File content and metadata

  - `file.title` - Document title
  - `file.content` - Extracted text content
  - `file.fileName` - Original filename
  - `file.fileType` - File extension
  - `file.fileSize` - File size in bytes

- **`pitch`**: Sales pitch data (when processing pitches)

  - `pitch.title` - Pitch title
  - `pitch.industry` - Target industry
  - `pitch.category` - Pitch category
  - `pitch.status` - Current status
  - `pitch.successRate` - Success rate percentage
  - `pitch.tags` - Associated tags

- **`customer`**: Customer information

  - `customer.name` - Customer name
  - `customer.company` - Company name
  - `customer.industry` - Industry sector
  - `customer.status` - Customer status
  - `customer.revenue` - Revenue data

- **`domainKnowledge`**: Domain knowledge metadata

  - `domainKnowledge.title` - Document title
  - `domainKnowledge.category` - Knowledge category
  - `domainKnowledge.tags` - Associated tags

- **`user`**: Current user information

  - `user.name` - User name
  - `user.email` - User email
  - `user.role` - User role

- **`metadata`**: Request metadata

  - `metadata.timestamp` - Request timestamp
  - `metadata.requestId` - Unique request ID
  - `metadata.source` - Request source

- **`customVariables`**: Custom variables passed in the request

### Jinja2 Filters

The template engine includes several useful filters:

- **`filesize`**: Format bytes as human-readable size

  ```jinja2
  File size: {{ file.fileSize | filesize }}
  ```

- **`formatdate`**: Format dates

  ```jinja2
  Created: {{ metadata.timestamp | formatdate }}
  ```

- **`truncate`**: Truncate long text

  ```jinja2
  Summary: {{ file.content | truncate(500) }}
  ```

- **`keywords`**: Extract keywords from text

  ```jinja2
  Keywords: {{ file.content | keywords(10) | join(', ') }}
  ```

- **`capitalize`**: Capitalize text
  ```jinja2
  Status: {{ pitch.status | capitalize }}
  ```

### Default Templates

The system comes with five pre-built templates:

1. **`sales_pitch_analysis`**: Comprehensive sales pitch evaluation
2. **`customer_insight_generation`**: Customer analysis and recommendations
3. **`document_summarization`**: General document summarization
4. **`knowledge_extraction`**: Extract structured knowledge from documents
5. **`content_generation`**: Generate new content based on existing materials

## File Processing

### Supported Formats

- **PDF** (`.pdf`) - Full text extraction with page counts
- **Word Documents** (`.doc`, `.docx`) - Text extraction preserving structure
- **Text Files** (`.txt`) - Direct content reading
- **Markdown** (`.md`) - Raw markdown content
- **CSV** (`.csv`) - Structured data with headers and sample rows

### Processing Options

```typescript
interface ProcessingOptions {
  maxLength?: number; // Maximum text length (default: 50000)
  preserveFormatting?: boolean; // Keep original formatting
  includeMetadata?: boolean; // Include extraction metadata
}
```

### File Content Structure

```typescript
interface FileContent {
  text: string; // Extracted text content
  metadata: {
    pageCount?: number; // Number of pages (PDF only)
    wordCount: number; // Total word count
    characterCount: number; // Total character count
    extractedAt: Date; // Extraction timestamp
    fileType: string; // File extension
    fileName: string; // Original filename
  };
}
```

## Error Handling

### Common Errors

1. **API Key Issues**

   ```
   Error: LLAMA_API_KEY is required in environment variables
   ```

   Solution: Add your API key to the `.env` file

2. **File Not Found**

   ```
   Error: File not found: /path/to/file
   ```

   Solution: Ensure the file exists and is accessible

3. **Unsupported File Type**

   ```
   Error: Unsupported file type: .xyz
   ```

   Solution: Use supported formats (PDF, DOC, DOCX, TXT, MD, CSV)

4. **Template Not Found**

   ```
   Error: Template 'template_name' not found
   ```

   Solution: Check template name or create the template

5. **Context Validation Errors**
   ```
   Error: Missing required variables: ['file', 'pitch']
   ```
   Solution: Provide all required context data

### Error Response Format

```json
{
  "status": "error",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

## Performance Optimization

### Best Practices

1. **File Size Limits**

   - Keep files under 50MB for optimal processing
   - Use `maxLength` parameter to limit text extraction

2. **Model Selection**

   - Use smaller models for simple tasks (3.2-3B, 3.2-1B)
   - Reserve larger models for complex analysis (3.3-70B, 3.1-405B)

3. **Caching**

   - File content is processed once and can be reused
   - Template rendering is cached for repeated requests

4. **Streaming**
   - Use streaming for long responses to improve user experience
   - Implement proper error handling for stream disconnections

### Processing Estimates

Get processing estimates before making requests:

```typescript
const estimate = await fetch(`/api/llama/file/estimate/${fileId}`);
const data = await estimate.json();
console.log(`Estimated processing time: ${data.data.estimatedProcessingTime}s`);
console.log(`Estimated tokens: ${data.data.estimatedTokens}`);
```

## Advanced Usage

### Custom Context Building

For advanced use cases, you can build custom contexts:

```typescript
const customContext = {
  file: {
    title: "Custom Analysis",
    content: "Your custom content here...",
    fileName: "custom.txt",
    fileType: "txt",
    fileSize: 1024,
  },
  customVariables: {
    analysisType: "competitive",
    focusArea: "pricing",
    targetMarket: "enterprise",
  },
};

// Process with custom context
const response = await fetch("/api/llama/process", {
  method: "POST",
  body: JSON.stringify({
    templateName: "competitive_analysis",
    customVariables: customContext.customVariables,
    // ... other parameters
  }),
});
```

### Template Validation

Validate templates before using them:

```typescript
const validation = await fetch("/api/llama/validate-context", {
  method: "POST",
  body: JSON.stringify({
    templateName: "sales_pitch_analysis",
    pitchId: "64a1b2c3d4e5f6789012345",
  }),
});

const result = await validation.json();
if (!result.data.isValid) {
  console.log("Missing variables:", result.data.missingVariables);
}
```

### Batch Processing

For processing multiple files, implement batch requests:

```typescript
const fileIds = ["id1", "id2", "id3"];
const results = await Promise.all(
  fileIds.map((fileId) =>
    fetch("/api/llama/process", {
      method: "POST",
      body: JSON.stringify({
        templateName: "document_summarization",
        fileId,
      }),
    }).then((r) => r.json())
  )
);
```

## Monitoring & Analytics

### Health Checks

Monitor the integration status:

```typescript
const status = await fetch("/api/llama/status");
const health = await status.json();

console.log("LLaMA Service:", health.data.services.llama ? "✅" : "❌");
console.log("Templates:", health.data.services.templates ? "✅" : "❌");
console.log(
  "File Processor:",
  health.data.services.fileProcessor ? "✅" : "❌"
);
```

### Usage Statistics

Track usage patterns:

```typescript
const stats = await fetch("/api/llama/stats");
const data = await stats.json();

console.log(`Total requests: ${data.data.totalRequests}`);
console.log(`Average processing time: ${data.data.averageProcessingTime}ms`);
console.log(`Popular templates:`, data.data.popularTemplates);
```

## Security Considerations

1. **API Key Protection**

   - Store API keys in environment variables
   - Never commit API keys to version control
   - Rotate keys regularly

2. **Input Validation**

   - All inputs are validated using Joi schemas
   - File types are restricted to safe formats
   - Content length limits are enforced

3. **Authentication**

   - All endpoints require valid JWT authentication
   - User context is automatically included in requests

4. **Rate Limiting**
   - Implement rate limiting for API calls
   - Monitor usage to prevent abuse

## Troubleshooting

### Common Issues

1. **Template Rendering Errors**

   - Check variable names match exactly
   - Ensure all required variables are provided
   - Validate Jinja2 syntax

2. **File Processing Failures**

   - Verify file accessibility
   - Check file format support
   - Ensure sufficient disk space

3. **API Connection Issues**
   - Verify API key validity
   - Check network connectivity
   - Confirm endpoint URLs

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
```

This will provide detailed information about:

- Template rendering process
- File processing steps
- API request/response details
- Error stack traces

## Contributing

### Adding New Templates

1. Create a new JSON file in `src/templates/prompts/`
2. Follow the template structure guidelines
3. Test with various input types
4. Document variable requirements

### Extending File Support

1. Add processor method in `FileProcessorService`
2. Update supported file types list
3. Add appropriate error handling
4. Update documentation

### Custom Filters

Add new Jinja2 filters in `PromptTemplateEngine.setupCustomFilters()`:

```typescript
this.env.addFilter("customFilter", (input: string) => {
  // Your custom logic here
  return processedInput;
});
```

## API Reference

For complete API documentation, see the individual route files and TypeScript interfaces. All endpoints return consistent response formats with proper error handling and status codes.

---

This integration provides a powerful, flexible foundation for AI-powered content analysis and generation within the SalesLens platform. The combination of LLaMA's capabilities with customizable templates enables sophisticated automation while maintaining full control over the AI's behavior and outputs.
