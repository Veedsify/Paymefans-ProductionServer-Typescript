import { Request, Response } from "express";
import SupportChatSession from "../models/SupportChatSession";
import SupportMessage from "../models/SupportMessage";
import SupportReview from "../models/SupportReview";
import IoInstance from "../libs/io";

// Start a new support chat session
export const startSession = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Check if user already has an active session
    let session = await SupportChatSession.findOne({
      userId,
      status: { $in: ["waiting", "active"] },
    });

    if (!session) {
      session = await SupportChatSession.create({ userId, status: "waiting" });
    }

    const io = IoInstance.getIO();
    io.emit("support:waiting-list-update");
    return res.status(201).json(session);
  } catch (err) {
    console.error("Error starting support session:", err);
    return res.status(500).json({ error: "Failed to start session" });
  }
};

// List waiting/active sessions (for agents)
export const listSessions = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const sessions = await SupportChatSession.find(
      status ? { status } : {},
    ).sort({ startedAt: 1 });
    return res.json(sessions);
  } catch (err) {
    console.error("Error listing support sessions:", err);
    return res.status(500).json({ error: "Failed to list sessions" });
  }
};

// Agent joins a session
export const joinSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, agentId } = req.body;
    const session = await SupportChatSession.findByIdAndUpdate(
      sessionId,
      { agentId, status: "active" },
      { new: true },
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const io = IoInstance.getIO();
    io.emit("support:waiting-list-update");
    io.to(session._id.toString()).emit("support:agent-joined", {
      agentId,
      session,
    });
    return res.json(session);
  } catch (err) {
    console.error("Error joining support session:", err);
    return res.status(500).json({ error: "Failed to join session" });
  }
};

// Agent/user ends a session
export const endSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = await SupportChatSession.findByIdAndUpdate(
      sessionId,
      { status: "ended", endedAt: new Date() },
      { new: true },
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const io = IoInstance.getIO();
    io.emit("support:waiting-list-update");
    io.to(session._id.toString()).emit("support:session-ended", { sessionId });
    return res.json(session);
  } catch (err) {
    console.error("Error ending support session:", err);
    return res.status(500).json({ error: "Failed to end session" });
  }
};

// Push session to another agent
export const pushSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, agentId } = req.body;
    const session = await SupportChatSession.findByIdAndUpdate(
      sessionId,
      { pushedToAgentId: agentId },
      { new: true },
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const io = IoInstance.getIO();
    io.to(session._id.toString()).emit("support:session-pushed", { agentId });
    return res.json(session);
  } catch (err) {
    console.error("Error pushing support session:", err);
    return res.status(500).json({ error: "Failed to push session" });
  }
};

// Send a message in a session
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, sender, senderId, message } = req.body;

    // Verify session exists
    const session = await SupportChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const msg = await SupportMessage.create({
      sessionId,
      sender,
      senderId,
      message,
      createdAt: new Date(),
    });

    const io = IoInstance.getIO();
    io.to(sessionId).emit("support:message", msg);
    return res.status(201).json(msg);
  } catch (err) {
    console.error("Error sending support message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

// Get messages for a session
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Verify session exists
    const session = await SupportChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const messages = await SupportMessage.find({ sessionId }).sort({
      createdAt: 1,
    });
    return res.json(messages);
  } catch (err) {
    console.error("Error getting support messages:", err);
    return res.status(500).json({ error: "Failed to get messages" });
  }
};

// Submit a review
export const submitReview = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, rating, comment } = req.body;

    // Verify session exists
    const session = await SupportChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const review = await SupportReview.create({
      sessionId,
      userId,
      rating,
      comment,
    });
    await SupportChatSession.findByIdAndUpdate(sessionId, {
      reviewId: review._id,
    });

    const io = IoInstance.getIO();
    io.to(sessionId).emit("support:review-submitted", review);
    return res.status(201).json(review);
  } catch (err) {
    console.error("Error submitting support review:", err);
    return res.status(500).json({ error: "Failed to submit review" });
  }
};

// New function for leaving a session
export const leaveSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, agentId } = req.body;
    const session = await SupportChatSession.findByIdAndUpdate(
      sessionId,
      { agentId: null, status: "waiting" },
      { new: true },
    );
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    const io = IoInstance.getIO();
    io.emit("support:waiting-list-update");
    io.to(sessionId).emit("support:agent-left", { agentId });
    return res.json(session);
  } catch (err) {
    console.error("Error leaving support session:", err);
    return res.status(500).json({ error: "Failed to leave session" });
  }
};
