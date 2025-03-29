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
const fs = __importStar(require("fs"));
const UploadImageCloudflare_1 = __importDefault(require("@libs/UploadImageCloudflare"));
const tus_1 = __importDefault(require("@libs/tus"));
const io_1 = __importDefault(require("@libs/io"));
class UploadController {
    static UploadMedia(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const io = io_1.default.getIO();
            try {
                const file = req.file;
                const fileId = req.body.fileId;
                const filePath = file.path;
                let upload = null;
                if (file.mimetype.includes('image/')) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const image = {
                        buffer: fileBuffer,
                        originalname: file.originalname,
                    };
                    // requires buffer
                    const uploadedImage = yield (0, UploadImageCloudflare_1.default)(image);
                    if ('error' in uploadedImage) {
                        throw new Error(uploadedImage.message);
                    }
                    upload = Object.assign(Object.assign({}, uploadedImage), { type: 'image' });
                    io.emit("upload-complete", {
                        id: fileId,
                        percentage: 100,
                    });
                }
                if (file.mimetype.includes('video/')) {
                    const video = yield (0, tus_1.default)({ filePath, file, fileId });
                    if ('error' in video) {
                        throw new Error(video.message);
                    }
                    upload = {
                        public: `${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}${video.mediaId}/manifest/video.m3u8`,
                        blur: ``,
                        id: video === null || video === void 0 ? void 0 : video.mediaId,
                        type: 'video'
                    };
                }
                if (!upload) {
                    res.status(400).json({ error: "Invalid file type" });
                }
                res.json(upload);
            }
            catch (error) {
                console.log(error);
                res.status(500).json({
                    error: true,
                    message: error.message
                });
            }
        });
    }
}
exports.default = UploadController;
