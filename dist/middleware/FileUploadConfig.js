"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUpload = CreateUpload;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const GenerateUniqueId_1 = require("@utils/GenerateUniqueId");
function CreateUpload(dir) {
    // Ensure the directory exists
    const uploadPath = path_1.default.join("public", "uploads", dir);
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
    }
    const storage = multer_1.default.diskStorage({
        destination: uploadPath,
        filename: (_, file, cb) => {
            let FILEID = `FILE${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            const uniqueSuffix = `${FILEID}`;
            const ext = path_1.default.extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
        },
    });
    return (0, multer_1.default)({
        storage,
        limits: { fileSize: 7 * 1024 * 1024 * 1024 }
    });
}
