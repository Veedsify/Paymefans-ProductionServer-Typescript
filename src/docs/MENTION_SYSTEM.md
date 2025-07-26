# Mention System Documentation

## Overview

The mention system allows users to mention other users in posts and comments, triggering notifications to the mentioned users.

## Components

### 1. MentionService (`src/services/MentionService.ts`)

- **processMentions**: Processes mentions and creates notifications
- **validateMentions**: Validates that mentioned users exist and are active

### 2. MentionNotificationJob (`src/jobs/MentionNotificationJob.ts`)

- Background job that processes mention notifications
- Uses BullMQ for queue management
- Automatically retries failed jobs

### 3. Type Definitions (`src/types/notifications.d.ts`)

- `MentionUser`: User information for mentions
- `MentionJobData`: Job data structure for mention processing

## Integration

### PostService Integration

When creating a post with mentions:

```typescript
// Process mentions if any
if (mentions && mentions.length > 0) {
  const validMentions = await MentionService.validateMentions(mentions);

  if (validMentions.length > 0) {
    await MentionNotificationQueue.add("processMentions", {
      mentions: validMentions,
      mentioner: { id, username, name },
      type: "post",
      contentId: postId,
      content: content,
    });
  }
}
```

### CommentsService Integration

When creating a comment with mentions:

```typescript
// Process mentions if any
if (mentions && mentions !== "[]") {
  const parsedMentions = JSON.parse(mentions);
  const validMentions = await MentionService.validateMentions(parsedMentions);

  if (validMentions.length > 0) {
    await MentionNotificationQueue.add("processMentions", {
      mentions: validMentions,
      mentioner: { id, username, name },
      type: "comment",
      contentId: post_id,
      content: comment,
    });
  }
}
```

## Notification Format

### Post Mentions

- Message: `<strong>{username}</strong> mentioned you in a post`
- URL: `{APP_URL}/posts/{post_id}`
- Action: `mention`

### Comment Mentions

- Message: `<strong>{username}</strong> mentioned you in a comment`
- URL: `{APP_URL}/posts/{post_id}#comment`
- Action: `mention`

## Features

### Validation

- Only active users can be mentioned
- Users cannot mention themselves
- Invalid mentions are filtered out

### Background Processing

- Mentions are processed asynchronously
- Failed jobs are automatically retried (3 attempts)
- Completed jobs are automatically cleaned up

### Database Integration

- Notifications are stored in the `notifications` table
- Each notification has a unique ID and timestamp
- Notifications include action type for filtering

## Usage Examples

### Frontend Integration

When a user types `@username` in a post or comment, the frontend should:

1. Search for matching users using the existing mention search endpoint
2. Include the selected mentions in the post/comment data
3. The backend will automatically process and send notifications

### Mention Data Structure

```typescript
const mentions = [
  {
    id: 123,
    username: "john_doe",
    name: "John Doe",
  },
  {
    id: 456,
    username: "jane_smith",
    name: "Jane Smith",
  },
];
```

## Error Handling

- Invalid mention data is logged and skipped
- Database errors are caught and logged
- Job failures are automatically retried
- System continues to function even if mention processing fails

## Performance Considerations

- Mentions are processed in background jobs to avoid blocking main requests
- Batch processing for multiple mentions in single job
- Redis-based queue for high performance
- Automatic cleanup of completed jobs
