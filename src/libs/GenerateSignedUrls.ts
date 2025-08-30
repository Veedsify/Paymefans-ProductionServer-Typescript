import Cloudflare from 'cloudflare';
import { redis } from './RedisStore';
const CLOUDFLARE_CUSTOMER_DOMAIN = process.env.CLOUDFLARE_CUSTOMER_DOMAIN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_IMAGE_KEY = process.env.CLOUDFLARE_IMAGE_KEY;
const CLOUDFLARE_ACCOUNT_TOKEN = process.env.CLOUDFLARE_ACCOUNT_TOKEN;
// const SIGNING_KEY = process.env.CLOUDFLARE_IMAGE_SIGN_KEY;
const expiresIn = 60 * 30  // 30 minutes - longer cache for better performance
const bufferToHex = (buffer: any) =>
    [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
const client = new Cloudflare({
    apiToken: CLOUDFLARE_ACCOUNT_TOKEN,
});


export const GenerateStreamToken = async (mediaId: string): Promise<string> => {
    const videoExp = Math.floor(Date.now() / 1000) + expiresIn;
    const res = await client.stream.token.create(mediaId, {
        account_id: CLOUDFLARE_ACCOUNT_ID!,
        exp: videoExp,
    });
    return res?.token ?? '';
}

const GenerateCloudflareSignedUrl = async (mediaId: string, type: string, urlString: string): Promise<string> => {
    try {
        switch (type) {
            case 'image':
                const imageCacheKey = `cf:image:${mediaId}:${urlString}`;
                const cachedImage = await redis.get(imageCacheKey);
                if (cachedImage) return cachedImage;
                if (!CLOUDFLARE_IMAGE_KEY) throw new Error('CLOUDFLARE_IMAGE_KEY is not set');
                if (!urlString) throw new Error('URL is required for image signing');

                const url = new URL(urlString);
                // Calculate the expiration timestamp
                const expiry = Math.floor(Date.now() / 1000) + expiresIn;
                const encoder = new TextEncoder();
                const secretKeyData = encoder.encode(CLOUDFLARE_IMAGE_KEY);
                const key = await crypto.subtle.importKey(
                    'raw',
                    secretKeyData,
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                );
                // Attach the expiration value to the `url`
                url.searchParams.set('exp', expiry.toString());
                const stringToSign = url.pathname + '?' + url.searchParams.toString();
                // Generate the signature
                const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
                const sig = bufferToHex(new Uint8Array(mac).buffer);
                // And attach it to the `url`
                url.searchParams.set('sig', sig);
                await redis.setex(imageCacheKey, expiresIn, url.toString());
                return url.toString();
            case 'video':
                const cacheKey = `cf:video:${mediaId}`;
                const cached = await redis.get(cacheKey);
                if (cached) return cached;
                const token = await GenerateStreamToken(mediaId);
                if (!token || token == "") throw new Error('Failed to generate stream token');
                const signedUrl = `${CLOUDFLARE_CUSTOMER_DOMAIN}/${token}/manifest/video.m3u8`;
                await redis.setex(cacheKey, expiresIn, signedUrl);
                return signedUrl;
            default:
                throw new Error('Unsupported media type');
        }
    } catch (error) {
        console.error('Error generating signed URL:', error);
        // Return original URL as fallback
        return urlString;
    }
}

// Batch process multiple media items for better performance
export const GenerateBatchSignedUrls = async (mediaItems: Array<{
    media_id: string;
    media_type: string;
    url: string;
    poster?: string;
    blur?: string;
}>): Promise<Array<{
    media_id: string;
    media_type: string;
    url: string;
    poster?: string;
    blur?: string;
}>> => {
    return Promise.all(
        mediaItems.map(async (media) => {
            try {
                const [signedUrl, signedPoster, signedBlur] = await Promise.all([
                    media.media_type === "video" ? GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.url) : Promise.resolve(media.url),
                    Promise.resolve(media.poster),
                    Promise.resolve(media.blur)
                ]);

                return {
                    ...media,
                    url: signedUrl,
                    poster: signedPoster || media.poster,
                    blur: signedBlur || media.blur
                };
            } catch (error) {
                console.error(`Error processing media ${media.media_id}:`, error);
                return media; // Return original if signing fails
            }
        })
    );
};

export default GenerateCloudflareSignedUrl;