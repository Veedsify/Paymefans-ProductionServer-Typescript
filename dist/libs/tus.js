"use strict";
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
const fs_1 = __importDefault(require("fs"));
const tus_js_client_1 = __importDefault(require("tus-js-client"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const io_1 = __importDefault(require("./io"));
const { CLOUDFLARE_ACCOUNT_TOKEN, CLOUDFLARE_ACCOUNT_ID } = process.env;
const tusUploader = (_a) => __awaiter(void 0, [_a], void 0, function* ({ filePath, file, fileId }) {
    const io = io_1.default.getIO();
    try {
        var stream = fs_1.default.createReadStream(filePath);
        var size = fs_1.default.statSync(filePath).size;
        var mediaId = "";
        var options = {
            endpoint: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
            headers: {
                Authorization: `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`,
            },
            chunkSize: 10 * 1024 * 1024, // Required a minimum chunk size of 5 MB. Here we use 50 MB.
            retryDelays: [0, 3000, 5000, 10000, 20000], // Indicates to tus-js-client the delays after which it will retry if the upload fails.
            metadata: {
                name: file.filename,
                filetype: "video/mp4",
                // Optional if you want to include a watermark
                // watermark: '<WATERMARK_UID>',
            },
            uploadSize: size,
            onError: function (error) {
                throw error;
            },
            onProgress: function (bytesUploaded, bytesTotal) {
                var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
                io.emit("upload-progress", {
                    id: fileId,
                    percentage: percentage,
                });
                console.log(bytesUploaded, bytesTotal, percentage + "%");
            },
            onSuccess: function () {
                console.log("Upload finished");
            },
            onAfterResponse: function (_, res) {
                return new Promise((resolve) => {
                    var mediaIdHeader = res.getHeader("stream-media-id");
                    if (mediaIdHeader) {
                        console.log("Media ID", mediaIdHeader);
                        mediaId = mediaIdHeader;
                    }
                    resolve(void 0);
                });
            },
        };
        return new Promise((resolve, reject) => {
            var upload = new tus_js_client_1.default.Upload(stream, Object.assign(Object.assign({}, options), { onSuccess: function () {
                    console.log("Upload finished");
                    io.emit("upload-complete", {
                        id: fileId,
                        percentage: 100,
                    });
                    resolve({
                        mediaId,
                    });
                }, onError: function (error) {
                    reject(error);
                } }));
            upload.start();
        });
    }
    catch (err) {
        console.log(err);
        return {
            error: true,
            message: err
        };
    }
});
exports.default = tusUploader;
