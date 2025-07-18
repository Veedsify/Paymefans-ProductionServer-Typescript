import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportReview extends Document {
    sessionId: string;
    userId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
}

const SupportReviewSchema = new Schema<ISupportReview>({
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.SupportReview || mongoose.model<ISupportReview>('SupportReview', SupportReviewSchema); 