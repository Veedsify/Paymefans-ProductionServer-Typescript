import ffmpeg from "fluent-ffmpeg";

export const getDuration = async (videoUrl: string): Promise<number> => {
  try {
    // Use a promise to wrap ffmpeg.ffprobe
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err, metadata) => {
        if (err) {
          console.error("Error getting video metadata:", err);
          reject(err); // Reject in case of error
        } else {
          const videoDuration = metadata.format.duration;
          console.log("Video duration (in seconds):", videoDuration);
          resolve(videoDuration || 0); // Resolve with duration or default to 0 if undefined
        }
      });
    });

    // Return the duration in milliseconds
    return Math.floor(duration * 1000);
  } catch (error) {
    console.error("Error calculating video duration:", error);
    throw new Error("Failed to get video duration");
  }
};
