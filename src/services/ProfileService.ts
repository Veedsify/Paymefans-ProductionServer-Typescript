import type { Request } from "express";
import type {
    BannerChangeResponse,
    ProfileServiceResponse,
    ProfileUpdateInfo,
    ProfileUpdateResponse,
} from "../types/profile";
import query from "@utils/prisma";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import type { UploadOptions } from "@libs/UploadImageToS3";
import { UpdateAvatarQueue } from "@jobs/comments/UpdateCommentsAvatar";

class ProfileService {
    // Get Profile
    static async Profile(username: string): Promise<ProfileServiceResponse> {
        const user_name = username.replace(/%40/g, "@");
        const user = await query.user.findFirst({
            where: {
                username: user_name,
            },
            select: {
                id: true,
                username: true,
                name: true,
                fullname: true,
                user_id: true,
                admin: true,
                role: true,
                is_active: true,
                is_verified: true,
                website: true,
                country: true,
                location: true,
                city: true,
                zip: true,
                active_status: true,
                post_watermark: true,
                total_followers: true,
                total_following: true,
                total_subscribers: true,
                email: true,
                profile_image: true,
                profile_banner: true,
                bio: true,
                Subscribers: {
                    select: {
                        subscriber_id: true,
                    },
                },
            },
        });

        if (!user) {
            return { message: "User not found", status: false };
        }
        return { message: "User found", status: true, user };
    }

    // Change Banner
    static async BannerChange(req: Request): Promise<BannerChangeResponse> {
        const { user } = req;
        const file = req.file; // Use Multer's file object
        let url = "";

        async function SaveBannerToDb(BannerUrl: string) {
            url = BannerUrl;
            await query.user.update({
                where: {
                    id: user?.id,
                },
                data: {
                    profile_banner: BannerUrl,
                },
            });
        }

        const options: UploadOptions = {
            file: file!,
            folder: "banners",
            contentType: "image/jpeg",
            resize: { width: 1950, height: 650, fit: "cover", position: "center" },
            deleteLocal: true,
            saveToDb: true,
            onUploadComplete: (BannerUrl: string) => SaveBannerToDb(BannerUrl),
            format: "webp",
            quality: 75,
        };

        await UploadImageToS3(options);

        return { message: "Banner updated", status: true, url };
    }

    static async ProfileUpdate(req: Request): Promise<ProfileUpdateResponse> {
        const { user } = req;
        const file = req.file; // Use Multer's file object
        let url = "";

        if (!file) {
            await this.ProfileUpdateInfo(req.body, user?.user_id!);
            return { message: "Profile updated", status: true, url: "" };
        }

        const SaveAvatarToDb = async (AvatarUrl: string) => {
            url = AvatarUrl;
            await query.user.update({
                where: {
                    id: user?.id,
                },
                data: {
                    profile_image: AvatarUrl,
                },
            });
            // Update comments avatar
            await UpdateAvatarQueue.add("UpdateAvatarQueue", { userId: user?.id, avatarUrl: AvatarUrl }, {
                attempts: 3,
                backoff: 5000,
            })

            await ProfileService.ProfileUpdateInfo(req.body, user?.user_id!);
        };

        const options: UploadOptions = {
            file: file!,
            folder: "avatars",
            contentType: "image/jpeg",
            resize: { width: 200, height: 200, fit: "cover", position: "center" },
            deleteLocal: true,
            saveToDb: true,
            onUploadComplete: (AvatarUrl: string) => SaveAvatarToDb(AvatarUrl),
            format: "webp",
            quality: 100,
        };

        await UploadImageToS3(options);

        return { message: "Avatar updated", status: true, url };
    }

    // Update Profile Info

    static async ProfileUpdateInfo(
        { name, location, bio, website, username }: ProfileUpdateInfo,
        userId: string
    ) {
        try {
            const updateUser = await query.user.update({
                where: {
                    user_id: userId,
                },
                data: {
                    name: name,
                    location: location,
                    bio: bio,
                    username: username,
                    website: website,
                },
            });
            query.$disconnect();
            return !!updateUser;
        } catch (err) {
            console.log(err);
            return false;
        }
    }
}

export default ProfileService;
