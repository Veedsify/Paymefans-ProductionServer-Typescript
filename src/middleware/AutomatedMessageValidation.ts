import type { Request, Response, NextFunction } from "express";

const validateAttachment = (attachment: any): boolean => {
    return (
        typeof attachment === "object" &&
        typeof attachment.id === "string" &&
        typeof attachment.name === "string" &&
        typeof attachment.url === "string" &&
        typeof attachment.size === "number" &&
        typeof attachment.extension === "string" &&
        (attachment.type === "image" || attachment.type === "video")
    );
};

export const validateAutomatedMessageUpdate = (
    req: Request,
    res: Response,
    next: NextFunction
): any => {
    const { followers, subscribers } = req.body;

    // Check if at least one message type is provided
    if (!followers && !subscribers) {
        return res.status(400).json({
            status: false,
            error: true,
            message: "At least one message type (followers or subscribers) must be provided",
        });
    }

    // Validate followers message if provided
    if (followers) {
        if (typeof followers.text !== "string") {
            return res.status(400).json({
                status: false,
                error: true,
                message: "Followers message text must be a string",
            });
        }

        if (!Array.isArray(followers.attachments)) {
            return res.status(400).json({
                status: false,
                error: true,
                message: "Followers attachments must be an array",
            });
        }

        // Validate each attachment
        for (const attachment of followers.attachments) {
            if (!validateAttachment(attachment)) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: "Invalid attachment format in followers message",
                });
            }
        }

        if (typeof followers.isActive !== "boolean") {
            return res.status(400).json({
                status: false,
                error: true,
                message: "Followers isActive must be a boolean",
            });
        }
    }

    // Validate subscribers message if provided
    if (subscribers) {
        if (typeof subscribers.text !== "string") {
            return res.status(400).json({
                status: false,
                error: true,
                message: "Subscribers message text must be a string",
            });
        }

        if (!Array.isArray(subscribers.attachments)) {
            return res.status(400).json({
                status: false,
                error: true,
                message: "Subscribers attachments must be an array",
            });
        }

        // Validate each attachment
        for (const attachment of subscribers.attachments) {
            if (!validateAttachment(attachment)) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: "Invalid attachment format in subscribers message",
                });
            }
        }

        if (typeof subscribers.isActive !== "boolean") {
            return res.status(400).json({
                status: false,
                error: true,
                message: "Subscribers isActive must be a boolean",
            });
        }
    }

    return next();
};