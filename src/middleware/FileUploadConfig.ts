import multer from "multer";
import path from "path";
import fs from "fs";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";

export function CreateUpload(dir: string) {
      // Ensure the directory exists
      const uploadPath = path.join("public", "uploads", dir);
      if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
      }

      const storage = multer.diskStorage({
            destination: uploadPath,
            filename: (_, file, cb) => {
                  let FILEID = `FILE${GenerateUniqueId()}`;
                  const uniqueSuffix = `${FILEID}`;
                  const ext = path.extname(file.originalname);
                  cb(null, `${uniqueSuffix}${ext}`);
            },
      });

      return multer({
            storage,
            limits: { fileSize: 7 * 1024 * 1024 * 1024 }
      });
}
