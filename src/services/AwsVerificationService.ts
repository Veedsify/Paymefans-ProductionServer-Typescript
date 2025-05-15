import type { AwsVerificationResponse, ProcessVerificationProps } from "../types/verification";
import { acceptedCountries } from "@utils/AcceptedVerificationCountries";
import { documentTypes } from "@utils/AcceptedDocumentTypes";
import { UploadImageToS3 } from "@libs/UploadImageToS3";

const { S3_BUCKET_NAME } = process.env;

export class AwsVerificationService {
    static async ProcessVerification({
        token,
        files,
        terms,
        country,
        documentType
    }: ProcessVerificationProps): Promise<AwsVerificationResponse> {
        if (!token) {
            return {
                error: true,
                message: "Token is required",
            };
        }

        if (!files || files.length === 0) {
            return {
                error: true,
                message: "Files are required",
            };
        }

        if (files.length === 0) {
            return {
                error: true,
                message: "No files uploaded",
            };
        }

        if (!terms || !country || !documentType) {
            return {
                error: true,
                message: "Missing required fields",
            };
        }

        // Check if the country is supported
        if (!acceptedCountries.includes(String(country).toLowerCase())) {
            return {
                error: true,
                message: "Country not supported",
            };
        }

        // Check if the document type is valid
        if (!documentTypes.includes(String(documentType).toLowerCase())) {
            return {
                error: true,
                message: "Invalid document type",
            };
        }

        const UploadToAws = files.map((file: Express.Multer.File) => {
            return new Promise<any>(async (resolve, reject) => {
                await UploadImageToS3({
                    file: file,
                    contentType: file.mimetype,
                    deleteLocal: true,
                    folder: "verification",
                    format: "jpeg",
                    onObjectOnly: (res) => {
                        if (!res) {
                            reject()
                            throw new Error("Error uploading file to S3");
                        }
                        resolve({
                            bucket: S3_BUCKET_NAME,
                            key: res
                        })
                    },
                    quality: 100,
                    resize: {
                        fit: "cover",
                        height: null,
                        width: 1500,
                        position: "center"
                    },
                    saveToDb: true
                })
            })
        })

        const results = await Promise.all(UploadToAws)

        const [front, back, faceVideo] = results

        return {
            error: false,
            message: "Verification process started",
            verification: {
                front: front,
                back: back,
                faceVideo: faceVideo
            }
        }

    }
}