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
const getUrl = (file) => {
    const { CLOUDFLARE_ACCOUNT_ID } = process.env;
    if (file.type.trim().includes('image')) {
        return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${file.id}`;
    }
    if (file.type.trim().includes('video')) {
        return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${file.id}`;
    }
    return '';
};
function RemoveCloudflareMedia(media) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const removeMediaPromises = media.map((file) => __awaiter(this, void 0, void 0, function* () {
                const url = getUrl(file);
                const options = {
                    method: 'DELETE',
                    headers: {
                        "Authorization": `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`
                    }
                };
                const deleteMedia = yield fetch(url, options);
                if (!deleteMedia.ok) {
                    return {
                        error: true,
                        message: `Failed to delete ${file.id}`
                    };
                }
                yield deleteMedia.json();
                return {
                    error: false,
                    message: `Deleted ${file.id}`
                };
            }));
            const removedMedia = yield Promise.all(removeMediaPromises);
            console.log(removedMedia);
            return removedMedia;
        }
        catch (err) {
            console.log(err);
            return {
                error: true,
                message: 'Error deleting media'
            };
        }
    });
}
exports.default = RemoveCloudflareMedia;
