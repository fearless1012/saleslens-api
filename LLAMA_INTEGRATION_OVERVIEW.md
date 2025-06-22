# SalesLens LLaMA Integration - Complete Overview

## 🎯 What is this integration?

The LLaMA integration allows your SalesLens application to use Meta's powerful LLaMA AI models to analyze, process, and generate insights from your uploaded files (sales pitches, customer data, domain knowledge) using customizable prompt templates.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes     │    │   Services      │
│   Dashboard     │───▶│   /api/llama/*   │───▶│   LLaMA Stack   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                               ┌─────────────────────────────────────┐
                               │        LLaMA Services Stack         │
                               │                                     │
                               │  ┌─────────────────────────────┐    │
                               │  │   LLaMAIntegrationService   │    │
                               │  │   (Main Orchestrator)       │    │
                               │  └─────────────────────────────┘    │
                               │              │                      │
                               │              ▼                      │
                               │  ┌─────────────────────────────┐    │
                               │  │   PromptTemplateEngine      │    │
                               │  │   (Jinja2 Templates)       │    │
                               │  └─────────────────────────────┘    │
                               │              │                      │
                               │              ▼                      │
                               │  ┌─────────────────────────────┐    │
                               │  │   FileProcessorService      │    │
                               │  │   (Extract Text Content)    │    │
                               │  └─────────────────────────────┘    │
                               │              │                      │
                               │              ▼                      │
                               │  ┌─────────────────────────────┐    │
                               │  │       LLaMAService          │    │
                               │  │   (API Communication)       │    │
                               │  └─────────────────────────────┘    │
                               └─────────────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   Meta LLaMA    │
                                    │   API Endpoint  │
                                    └─────────────────┘
```

## 🔑 Key Components Explained

### 1. **LLaMAService** (`src/services/llamaService.ts`)

**What it does:** Direct communication with Meta's LLaMA API

- Handles API authentication using your API key
- Manages HTTP requests/responses
- Supports both regular and streaming responses
- Implements retry logic and error handling

**Key methods:**

- `generateText()` - Send prompt, get response
- `generateTextStream()` - Send prompt, get streaming response
- `validateConnection()` - Test API connectivity

### 2. **PromptTemplateEngine** (`src/services/promptTemplateService.ts`)

**What it does:** Manages Jinja2-like prompt templates

- Creates dynamic prompts using variables
- Supports template inheritance and filters
- Validates template syntax
- Manages template storage and retrieval

**Key features:**

- **Variables:** `{{ customer.name }}`, `{{ file.content }}`
- **Filters:** `{{ text | truncate(100) }}`, `{{ list | join(', ') }}`
- **Conditionals:** `{% if customer.industry %}...{% endif %}`
- **Loops:** `{% for tag in pitch.tags %}...{% endfor %}`

### 3. **FileProcessorService** (`src/services/fileProcessorService.ts`)

**What it does:** Extracts text content from uploaded files

- Supports PDF, DOCX, TXT, MD, CSV files
- Cleans and normalizes text content
- Provides processing estimates
- Handles file metadata

### 4. **LLaMAIntegrationService** (`src/services/llamaIntegrationService.ts`)

**What it does:** Main orchestrator that combines everything

- Builds context from database records
- Renders templates with real data
- Coordinates file processing and LLaMA calls
- Manages streaming responses

## 🚀 How to Use It

### 1. **Setup (One-time)**

```bash
# 1. Add your API key to .env file
echo "LLAMA_API_KEY=your_actual_api_key_here" >> .env

# 2. Test the connection
npm run dev
# Then visit: http://localhost:3000/api/llama/status
```

### 2. **Basic Usage - Analyze a Sales Pitch**

```typescript
// API call from frontend:
POST /api/llama/process
{
  "templateName": "pitch_analysis",
  "pitchId": "675a1234567890abcdef1234",
  "options": {
    "model": "llama-3.3-70b-instruct",
    "temperature": 0.7
  }
}
```

### 3. **Advanced Usage - Custom Analysis**

```typescript
POST /api/llama/process
{
  "templateName": "custom_sales_insights",
  "pitchId": "675a1234567890abcdef1234",
  "customerId": "675a9876543210fedcba9876",
  "customVariables": {
    "analysisType": "competitive_analysis",
    "focusAreas": ["pricing", "features", "objections"]
  }
}
```

## 📝 Prompt Templates Explained

Templates are stored in `src/templates/prompts/` and use Jinja2 syntax:

### Example Template: `pitch_analysis.json`

```json
{
  "name": "pitch_analysis",
  "description": "Analyze sales pitch effectiveness",
  "category": "analysis",
  "systemPrompt": "You are an expert sales coach analyzing sales pitches.",
  "userPrompt": "Analyze this sales pitch for {{ customer.name }} in the {{ customer.industry }} industry:\n\n{{ file.content }}\n\nProvide insights on:\n1. Strengths\n2. Weaknesses\n3. Improvement suggestions",
  "variables": ["customer.name", "customer.industry", "file.content"],
  "model": "llama-3.3-70b-instruct",
  "temperature": 0.7
}
```

### Available Variables in Templates:

- **`file.*`** - Content from uploaded files
- **`pitch.*`** - Sales pitch data
- **`customer.*`** - Customer information
- **`domainKnowledge.*`** - Industry/domain knowledge
- **`user.*`** - Current user details
- **`customVariables.*`** - Your custom data

## 🛠️ Available API Endpoints

| Endpoint                      | Method | Purpose                      |
| ----------------------------- | ------ | ---------------------------- |
| `/api/llama/process`          | POST   | Process request with LLaMA   |
| `/api/llama/process/stream`   | POST   | Stream response in real-time |
| `/api/llama/templates`        | GET    | List all templates           |
| `/api/llama/templates`        | POST   | Create new template          |
| `/api/llama/templates/:name`  | PUT    | Update template              |
| `/api/llama/templates/:name`  | DELETE | Delete template              |
| `/api/llama/suggest-template` | POST   | AI-suggested templates       |
| `/api/llama/status`           | GET    | Health check                 |

## 💡 Real-World Use Cases

### 1. **Sales Pitch Analysis**

```json
{
  "templateName": "pitch_effectiveness",
  "pitchId": "your_pitch_id",
  "customVariables": {
    "analysisDepth": "detailed",
    "includeCompetitorComparison": true
  }
}
```

### 2. **Customer Insights Generation**

```json
{
  "templateName": "customer_profile_analysis",
  "customerId": "your_customer_id",
  "domainKnowledgeId": "industry_insights_id"
}
```

### 3. **Document Summarization**

```json
{
  "templateName": "document_summary",
  "fileId": "uploaded_file_id",
  "customVariables": {
    "summaryLength": "executive",
    "focusAreas": ["key_decisions", "action_items"]
  }
}
```

## 🔧 Testing Your Integration

### 1. **Quick Health Check**

```bash
curl http://localhost:3000/api/llama/status
```

### 2. **Test Script**

```bash
cd saleslens-api
npx ts-node src/scripts/test-llama.ts
```

### 3. **Frontend Integration**

```typescript
// In your React component:
const analyzePitch = async (pitchId: string) => {
  const response = await fetch("/api/llama/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateName: "pitch_analysis",
      pitchId: pitchId,
    }),
  });
  const result = await response.json();
  console.log("LLaMA Analysis:", result.data.response);
};
```

## 📊 Response Format

Every LLaMA request returns:

```json
{
  "status": "success",
  "data": {
    "requestId": "req_1734869234567_abc123def",
    "templateUsed": "pitch_analysis",
    "response": "Based on the analysis...",
    "metadata": {
      "promptTokens": 850,
      "completionTokens": 425,
      "totalTokens": 1275,
      "processingTime": 3240,
      "model": "llama-3.3-70b-instruct"
    },
    "context": {
      "file": { "fileName": "pitch.pdf", "wordCount": 1200 },
      "pitch": { "title": "Q4 Sales Proposal" },
      "customer": { "name": "Acme Corp" }
    }
  }
}
```

## 🎯 Next Steps

1. **Add your API key** to `.env` file
2. **Test the integration** using the health check endpoint
3. **Create custom templates** for your specific use cases
4. **Integrate with frontend** to trigger LLaMA processing
5. **Monitor usage** through the metadata in responses

## 🔐 Security Notes

- API keys are stored in environment variables (never in code)
- All endpoints require authentication
- File processing happens server-side only
- Templates are validated before execution
- Rate limiting is implemented for API calls

The integration is now ready to use! You can start analyzing your sales data with AI-powered insights.
