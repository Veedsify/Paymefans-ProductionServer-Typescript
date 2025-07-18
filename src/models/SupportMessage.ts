import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportMessage extends Document {
    sessionId: string;
    sender: 'user' | 'agent';
    senderId: string;
    message: string;
    createdAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>({
    sessionId: { type: String, required: true },
    sender: { type: String, enum: ['user', 'agent'], required: true },
    senderId: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.SupportMessage || mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema); 