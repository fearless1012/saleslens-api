# SalesLens API - Backend Setup Guide

## Overview

SalesLens API is the backend service for the SalesLens application, which provides API endpoints for managing domain knowledge, customers, pitches, user authentication, courses, and simulations.

## Prerequisites

- Node.js (v16 or later)
- MongoDB (local installation or connection to MongoDB Atlas)
- Redis (for WebSocket support)

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Install additional dependencies:

```bash
npm install --save uuid fast-csv
npm install --save-dev @types/uuid @types/fast-csv
```

## Configuration

1. Create a `.env` file in the root directory with the following variables:

```
PORT=3001
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
SESSION_SECRET=your_secret_key_here
```

2. Make sure your MongoDB connection string is properly configured in the `config/default.js` file.

## Running Migrations

Migrations are automatically run when the server starts. They create the necessary indexes for the MongoDB collections and ensure upload directories exist.

To run migrations manually:

```bash
npx ts-node src/migrations/index.ts
```

## Running the Server

Start the development server:

```bash
npm run dev
```

Or for production:

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Domain Knowledge

- `GET /api/domain-knowledge` - Get all domain knowledge documents
- `GET /api/domain-knowledge/:id` - Get domain knowledge by ID
- `POST /api/domain-knowledge` - Upload new domain knowledge document
- `PUT /api/domain-knowledge/:id` - Update domain knowledge
- `DELETE /api/domain-knowledge/:id` - Delete domain knowledge
- `GET /api/domain-knowledge/download/:id` - Download domain knowledge file

### Customers

- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `POST /api/customers/import` - Import customers from CSV
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/search/:query` - Search customers

### Pitches

- `GET /api/pitches` - Get all pitches
- `GET /api/pitches/:id` - Get pitch by ID
- `POST /api/pitches` - Upload new pitch
- `PUT /api/pitches/:id` - Update pitch
- `PUT /api/pitches/:id/feedback` - Add feedback to pitch
- `DELETE /api/pitches/:id` - Delete pitch
- `GET /api/pitches/download/:id` - Download pitch file
- `GET /api/pitches/search/:query` - Search pitches

## Folder Structure

```
saleslens-api/
├── src/
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── migrations/       # Database migrations
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── startup/          # Startup configuration
│   ├── utils/            # Utility functions
│   ├── index.ts          # Entry point
├── uploads/              # File storage
├── package.json
└── tsconfig.json
```

## File Storage

All uploaded files are stored in the following directories:

- Domain Knowledge: `/uploads/domain-knowledge/`
- Customer CSV Imports: `/uploads/customers/`
- Pitches: `/uploads/pitches/`

These directories are automatically created when the server starts.

## Activity Logging

All actions (create, update, delete, view, download) are logged in the Activity collection, which is used for dashboard activity feeds.
