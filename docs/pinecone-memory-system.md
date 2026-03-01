# Pinecone Memory System

This project now supports two memory types backed by Pinecone:

1. `Workspace Memory`
2. `Conversation Memory`

## Environment Variables

Set these in your runtime environment:

- `PINECONE_API_KEY`
- `PINECONE_INDEX_HOST`
- `PINECONE_VECTOR_DIMENSION` (example: `64`)

## Workspace Memory

Stores:

- user preferences
- industry
- accounting method (`cash` or `accrual`)
- recurring vendors
- custom categories

### GET `/api/memory/workspace`

Query params:

- `workspaceId` or `businessId`

### POST `/api/memory/workspace`

Body:

```json
{
  "workspaceId": "your-workspace-uuid",
  "industry": "Ecommerce",
  "accountingMethod": "accrual",
  "recurringVendors": ["Razorpay", "AWS"],
  "customCategories": ["Influencer Spend", "Marketplace Fees"],
  "userPreferences": {
    "currency": "INR",
    "timezone": "Asia/Kolkata"
  }
}
```

## Conversation Memory

Stores:

- last 10 finance queries
- recent tool outputs

### GET `/api/memory/conversation`

Query params:

- `workspaceId` or `businessId`

### POST `/api/memory/conversation`

Body examples:

```json
{
  "workspaceId": "your-workspace-uuid",
  "query": "What is our projected GST payable this month?"
}
```

```json
{
  "workspaceId": "your-workspace-uuid",
  "toolOutput": {
    "tool": "gst-risk-checker",
    "output": "GST due in 5 days. Estimated payable: INR 112,450."
  }
}
```
