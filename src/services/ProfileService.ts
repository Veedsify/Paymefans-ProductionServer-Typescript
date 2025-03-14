import { Request } from "express";
import { BannerChangeResponse, ProfileServiceResponse } from "../types/profile";
import query from "../utils/prisma";
import sharp from "sharp"
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import s3 from "../utils/s3";
import { UploadOptions, UploadImageToS3 } from "../libs/UploadImageToS3";


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
            let url = ""
            async function SaveBannerToDb(BannerUrl: string) {
                  url = BannerUrl
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
                  resize: { width: 1500, height: 500, fit: "cover", position: "center" },
                  deleteLocal: true,
                  saveToDb: true,
                  onUploadComplete: (BannerUrl: string) => SaveBannerToDb(BannerUrl),
                  format: "webp",
                  quality: 80,
            }

            await UploadImageToS3(options)

            return { message: "Banner updated", status: true, url };
      }
}

export default ProfileService
