# Admin API Refactoring Documentation

## Overview

This document outlines the refactoring of the admin API endpoints to follow a proper separation of concerns pattern: **Routes → Controllers → Services → Database**. This refactoring improves code maintainability, testability, and reusability.

## Architecture Changes

### Before Refactoring
- Business logic mixed directly in route handlers
- Database operations scattered throughout controllers
- Limited reusability of code
- Difficult to test individual components

### After Refactoring
```
Routes (admin.ts) 
    ↓
Controllers (AdminXxxController.ts)
    ↓
Services (XxxService.ts)
    ↓
Database (Prisma)
```

## New Structure

### Services Layer
Services contain all business logic and database operations:

#### 1. **WithdrawalService** (`/services/WithdrawalService.ts`)
Handles all withdrawal-related business logic:
- `rejectWithdrawal()` - Reject withdrawal and restore points
- `approveWithdrawal()` - Approve withdrawal request
- `getWithdrawalById()` - Get withdrawal details
- `getWithdrawals()` - Get withdrawals with pagination/filters
- `restorePointsToUser()` - Private method for point restoration

#### 2. **PointsService** (`/services/PointsService.ts`)
Manages all points-related operations:
- `updateUserPoints()` - Add or subtract points
- `getUserPointsBalance()` - Get user's current balance
- `getMultipleUsersPointsBalance()` - Bulk balance queries
- `transferPoints()` - Transfer points between users
- `getUserPointsHistory()` - Get transaction history
- `getPointsStatistics()` - System-wide statistics

#### 3. **NotificationService** (`/services/NotificationService.ts`)
Enhanced with admin functionality:
- `createNotification()` - Create single notification
- `createBulkNotifications()` - Create notifications for multiple users
- `getAllNotifications()` - Get all notifications with pagination
- `deleteNotification()` - Delete notification
- `updateNotificationStatus()` - Mark as read/unread

### Controllers Layer
Controllers handle HTTP requests/responses and call services:

#### 1. **AdminWithdrawalController** (`/controllers/AdminWithdrawalController.ts`)
- `rejectWithdrawal()` - Handle withdrawal rejection
- `approveWithdrawal()` - Handle withdrawal approval
- `getWithdrawal()` - Get single withdrawal
- `getWithdrawals()` - Get withdrawals list
- `getWithdrawalStats()` - Get withdrawal statistics

#### 2. **AdminPointsController** (Enhanced)
- `UpdateUserPoints()` - Update user points
- `GetUserPointsBalance()` - Get user balance
- `GetPointsStatistics()` - Get points statistics
- `GetUserPointsHistory()` - Get transaction history
- `TransferPoints()` - Transfer between users
- `GetMultipleUsersPoints()` - Bulk balance queries

#### 3. **AdminNotificationController** (Enhanced)
- `CreateNotification()` - Create single notification
- `CreateBulkNotifications()` - Create bulk notifications
- `GetAllNotifications()` - Get all notifications
- `DeleteNotification()` - Delete notification
- `UpdateNotificationStatus()` - Update notification status

## API Endpoints

### Withdrawal Management
```
POST   /admin/withdrawal/reject          - Reject withdrawal
POST   /admin/withdrawal/approve         - Approve withdrawal
GET    /admin/withdrawal/:withdrawal_id  - Get withdrawal details
GET    /admin/withdrawals               - List withdrawals with filters
GET    /admin/withdrawal-stats          - Get withdrawal statistics
```

### Points Management
```
POST   /admin/points/update             - Update user points
GET    /admin/points/balance/:user_id   - Get user balance
GET    /admin/points/stats              - Get points statistics
GET    /admin/points/history/:user_id   - Get user transaction history
POST   /admin/points/transfer           - Transfer points between users
POST   /admin/points/users              - Get multiple users' balances
```

### Notification Management
```
POST   /admin/notifications/create      - Create single notification
POST   /admin/notifications/bulk        - Create bulk notifications
GET    /admin/notifications             - Get all notifications
DELETE /admin/notifications/:id         - Delete notification
PATCH  /admin/notifications/:id/status  - Update notification status
```

## Request/Response Examples

### Withdraw Points (Reject Withdrawal)
```typescript
// Request
POST /admin/withdrawal/reject
{
  "withdrawal_id": 123,
  "user_id": "user_12345",
  "amount": 1000,
  "reason": "Insufficient documentation"
}

// Response
{
  "error": false,
  "message": "Withdrawal rejected and points restored successfully",
  "data": {
    "withdrawal_id": 123,
    "user_id": "user_12345",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "points_restored": 50,
    "new_balance": 150,
    "status": "rejected",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Update User Points
```typescript
// Request
POST /admin/points/update
{
  "user_id": "user_12345",
  "points": 100,
  "operation": "add"
}

// Response
{
  "error": false,
  "message": "User points added successfully",
  "data": {
    "user_id": "user_12345",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "points": 250,
    "operation": "add",
    "amount": 100,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Create Bulk Notifications
```typescript
// Request
POST /admin/notifications/bulk
{
  "user_ids": ["user_12345", "user_67890"],
  "message": "System maintenance scheduled for tonight",
  "action": "message",
  "url": null
}

// Response
{
  "error": false,
  "message": "Bulk notifications created successfully",
  "data": {
    "created_count": 2,
    "notifications": [...]
  }
}
```

## Benefits of Refactoring

### 1. **Separation of Concerns**
- Routes handle only HTTP layer
- Controllers manage request/response flow
- Services contain business logic
- Database operations are isolated

### 2. **Reusability**
- Services can be used across different controllers
- Business logic is centralized and consistent
- Easy to create new endpoints using existing services

### 3. **Testability**
- Each layer can be unit tested independently
- Services can be mocked in controller tests
- Business logic testing is isolated from HTTP concerns

### 4. **Maintainability**
- Changes to business logic only affect services
- Database schema changes isolated to service layer
- Clear responsibility boundaries

### 5. **Error Handling**
- Consistent error handling across all endpoints
- Service-level validation and error messages
- Proper HTTP status codes in controllers

## Type Safety

All services use TypeScript interfaces for:
- Input validation
- Return type consistency
- Better IDE support and autocomplete

```typescript
export interface UpdatePointsData {
  user_id: string;
  points: number;
  operation: "add" | "subtract";
}

export interface PointsUpdateResult {
  user_id: string;
  user_name: string;
  user_email: string;
  points: number;
  operation: string;
  amount: number;
}
```

## Migration Guide

### For New Features
1. Create business logic in appropriate service
2. Add controller method that calls service
3. Add route that calls controller
4. Add proper TypeScript interfaces

### For Existing Code
1. Move business logic from routes/controllers to services
2. Update controllers to call services
3. Ensure proper error handling
4. Add type definitions

## Error Handling Pattern

```typescript
// Service Layer
static async updateUserPoints(data: UpdatePointsData): Promise<PointsUpdateResult> {
  if (!data.user_id || data.points < 0) {
    throw new Error("user_id and valid points amount are required");
  }
  // ... business logic
}

// Controller Layer
static async UpdateUserPoints(req: Request, res: Response): Promise<void> {
  try {
    const result = await PointsService.updateUserPoints(req.body);
    res.status(200).json({
      error: false,
      message: "User points updated successfully",
      data: result
    });
  } catch (err: any) {
    res.status(500).json({
      error: true,
      message: err.message || "Something went wrong"
    });
  }
}
```

## Future Enhancements

1. **Caching Layer**: Add Redis caching for frequently accessed data
2. **Audit Logging**: Track all admin actions for compliance
3. **Rate Limiting**: Implement rate limiting for admin endpoints
4. **Batch Operations**: Add more bulk operation endpoints
5. **Real-time Updates**: WebSocket notifications for admin dashboard
6. **Permission System**: Role-based access control for different admin levels

This refactoring provides a solid foundation for scaling the admin API while maintaining code quality and developer productivity.