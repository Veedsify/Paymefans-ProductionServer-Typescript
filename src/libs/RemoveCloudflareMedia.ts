import type { RemoveCloudflareMediaResponse } from "../types/cloudflare";
import type { RemovedMedia } from "../types/post";

const getUrl = (file: RemovedMedia): string => {
  const { CLOUDFLARE_ACCOUNT_ID } = process.env;
  if (file.type.trim().includes("image")) {
    return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${file.id}`;
  }
  if (file.type.trim().includes("video")) {
    return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${file.id}`;
  }
  return "";
};

async function RemoveCloudflareMedia(
  media: RemovedMedia[],
): Promise<RemoveCloudflareMediaResponse> {
  try {
    const removeMediaPromises = media.map(async (file) => {
      const url = getUrl(file);
      const options = {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`,
        },
      };
      const deleteMedia = await fetch(url as string, options);
      if (!deleteMedia.ok) {
        return {
          error: true,
          message: `Failed to delete ${file.id}`,
        };
      }
      await deleteMedia.json();
      return {
        error: false,
        message: `Deleted ${file.id}`,
      };
    });
    const removedMedia = await Promise.all(removeMediaPromises);
    if (removedMedia.some((res) => res.error)) {
      return {
        error: true,
        message: "Some media could not be removed",
        data: removedMedia.filter((res) => !res.error),
      };
    }
    // If all media were removed successfully, return the data
    console.log("All media removed successfully:", removedMedia);
    return {
      error: false,
      message: "All media removed successfully",
      data: removedMedia,
    };
  } catch (err) {
    console.log(err);
    throw new Error("Failed to remove media from Cloudflare");
  }
}

export default RemoveCloudflareMedia;
