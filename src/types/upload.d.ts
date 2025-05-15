export type UploadResponseResponse = {
  error: boolean;
  id: string;
  uploadUrl: string;
  type: string;
  message: string;
};
export type UploadMedieDataProps =
  | {
      type: "video" | "image";
      fileType: string;
      fileName: string;
      maxDuration: number;
      fileSize: number;
    }
  | {
      explicitImageType: string;
      type: "video" | "image";
      fileType: string;
    };
