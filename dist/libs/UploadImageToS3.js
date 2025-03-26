"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadImageToS3 = UploadImageToS3;
const fs = __importStar(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const client_s3_1 = require("@aws-sdk/client-s3");
const path_1 = __importDefault(require("path"));
const s3_1 = __importDefault(require("@utils/s3"));
/**
 * Uploads a file to S3 with optional resizing, format conversion, and a callback for further processing.
 * @param {UploadOptions} options - Configuration options
 * @returns {Promise<string>} - The uploaded file URL
 */
function UploadImageToS3(_a) {
    return __awaiter(this, arguments, void 0, function* ({ file, folder = "uploads", resize = { width: 1200, height: 1200, fit: "cover", position: "center" }, format = "webp", quality = 80, contentType = "image/webp", saveToDb = false, deleteLocal = true, onUploadComplete, }) {
        var _b, _c;
        if (!file) {
            throw new Error("No file uploaded");
        }
        const filename = file.filename.replace(/\.[^/.]+$/, ''); // Remove any existing extension
        const fileKey = `${folder}/${folder}-${filename}.${format}`;
        const tempFilePath = path_1.default.join("public/uploads", `temp-${folder}-${filename}.${format}`);
        // Resize and compress image
        yield ((_c = (_b = (0, sharp_1.default)(file.path)
            .resize(resize)
            .toFormat(format))[format]) === null || _c === void 0 ? void 0 : _c.call(_b, { quality }).toFile(tempFilePath));
        // Read file buffer
        const fileStream = yield fs.readFile(tempFilePath);
        // Upload to S3
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            Body: fileStream,
            ContentType: contentType,
        });
        yield s3_1.default.send(command);
        // Construct file URL
        const fileUrl = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;
        // Delete local files if enabled
        function deleteFiles(tempFilePath, filePath) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    yield fs.rm(tempFilePath); // Delete resized file
                    yield fs.rm(filePath);
                }
                catch (err) {
                    console.error("Error deleting local files:", err);
                }
            });
        }
        if (deleteLocal) {
            try {
                yield deleteFiles(tempFilePath, file.path);
            }
            catch (err) {
                console.error("Error deleting local files:", err);
            }
        }
        // If saveToDb is enabled, trigger the callback
        if (saveToDb && onUploadComplete) {
            yield onUploadComplete(fileUrl);
        }
        return fileUrl;
    });
}
