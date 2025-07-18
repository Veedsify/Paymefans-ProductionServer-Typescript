import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportChatSession extends Document {
    userId: string;
    agentId?: string;
    status: 'waiting' | 'active' | 'ended';
    startedAt: Date;
    endedAt?: Date;
    pushedToAgentId?: string;
    reviewId?: string;
}

const SupportChatSessionSchema = new Schema<ISupportChatSession>({
    userId: { type: String, required: true },
    agentId: { type: String },
    status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    pushedToAgentId: { type: String },
    reviewId: { type: String },
});

export default mongoose.models.SupportChatSession || mongoose.model<ISupportChatSession>('SupportChatSession', SupportChatSessionSchema); 