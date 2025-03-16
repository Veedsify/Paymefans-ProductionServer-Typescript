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
Object.defineProperty(exports, "__esModule", { value: true });
function UploadImageCloudflare(image) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const UPLOAD_IMAGE = process.env.CLOUDFLARE_IMAGE_UPLOAD;
            const ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;
            const formData = new FormData();
            const blob = new Blob([image.buffer]);
            formData.append("file", blob, image.originalname);
            const response = yield fetch(UPLOAD_IMAGE, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`
                },
                body: formData // Streaming formData
            });
            const uploadedImage = yield response.json();
            if (!uploadedImage.success) {
                return {
                    error: true,
                    message: uploadedImage.errors[0].message
                };
            }
            return {
                public: `https://imagedelivery.net/${ACCOUNT_HASH}/${uploadedImage.result.id}/public`,
                blur: `https://imagedelivery.net/${ACCOUNT_HASH}/${uploadedImage.result.id}/blured`,
                id: uploadedImage.result.id
            };
        }
        catch (err) {
            console.error(err);
            return {
                error: true,
                message: err.message
            };
        }
    });
}
exports.default = UploadImageCloudflare;
