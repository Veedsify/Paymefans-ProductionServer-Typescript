const config = {
  // App
  defaultPort: process.env.PORT,
  // AWS BUCKETS
  mainPaymefansBucket: process.env.S3_BUCKET_NAME,
  storyVideoBucket: process.env.S3_STORY_VIDEO_BUCKET,
  storyImageBucket: process.env.S3_STORY_IMAGE_BUCKET,
  storyProcessedVideoBucket: process.env.S3_STORY_PROCESSED_BUCKET,
  // AWS CLOUDFRONTS
  mainCloudfrontUrl: process.env.AWS_CLOUDFRONT_URL,
  processedCloudfrontUrl: process.env.AWS_PROCESSED_CLOUDFRONT_URL,

  // Subscription Minimum Price in Naira
  minimumSubscriptionPriceNgn: 10_000,
  minmumTipAmountNgn: 1_000,
};

export { config };
