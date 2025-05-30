
export interface UploadedFile extends Express.Multer.File {
      filename: string;
}

export type TusUploader = {
      filePath: string;
      file: UploadedFile;
      fileId: string;
}

export type TusUploaderSuccessResponse = {
      mediaId: string;
}

export type TusUploaderErrorResponse = {
      message: string;
      error: boolean;
}

export type TusUploaderResponse = TusUploaderSuccessResponse | TusUploaderErrorResponse;

export type FileUploadSuccess = {
      public: string;
      blur: string;
      id: string;
}

export type FileUploadError = {
      error: true;
      message: string;
}

export type FileUpload = FileUploadSuccess | FileUploadError;

export interface UploadFileType extends FileUploadSuccess {
      type: 'image' | 'video';
}

export type RemoveCloudflareMediaResponse = {
      error: boolean;
      message: string;
      data: {
            error: boolean;
            message: string;
      }[];
}
