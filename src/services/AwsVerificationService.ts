import type { AwsVerificationResponse, ProcessVerificationProps } from "../types/verification";
import { acceptedCountries } from "@utils/AcceptedVerificationCountries";
import { documentTypes } from "@utils/AcceptedDocumentTypes";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import { validateIDDocument, analyzeDocumentQuality, detectFaceQuality } from "./AwsDocumentValidationService";

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

        // Enhanced validation: Check file count more strictly
        if (files.length !== 3) {
            return {
                error: true,
                message: "Exactly 3 files required: front of ID, back of ID, and face photo",
            };
        }

        // Enhanced validation: Check file sizes and types
        for (const file of files) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                return {
                    error: true,
                    message: "File size too large. Please ensure each file is under 5MB.",
                };
            }

            // Check file type
            if (!file.mimetype.startsWith('image/')) {
                return {
                    error: true,
                    message: "Invalid file type. Only image files are allowed.",
                };
            }

            // Check supported formats
            const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!supportedFormats.includes(file.mimetype)) {
                return {
                    error: true,
                    message: "Unsupported image format. Please use JPEG or PNG files.",
                };
            }
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

        // Enhanced validation: Validate documents using AWS services
        try {
            // Validate front document quality and authenticity
            const frontQuality = await analyzeDocumentQuality(front);
            if (frontQuality.error) {
                return {
                    error: true,
                    message: `Front document: ${frontQuality.message}`,
                };
            }

            // Validate front document content
            const frontValidation = await validateIDDocument(front, country, documentType);
            if (frontValidation.error) {
                return {
                    error: true,
                    message: `Front document: ${frontValidation.message}`,
                };
            }

            // Validate back document quality (if required)
            if (documentType !== 'passport') {
                const backQuality = await analyzeDocumentQuality(back);
                if (backQuality.error) {
                    return {
                        error: true,
                        message: `Back document: ${backQuality.message}`,
                    };
                }
            }

            // Validate face photo quality
            const faceQuality = await detectFaceQuality(faceVideo);
            if (faceQuality.error) {
                return {
                    error: true,
                    message: `Face photo: ${faceQuality.message}`,
                };
            }

        } catch (validationError: any) {
            console.error("Document validation error:", validationError);
            return {
                error: true,
                message: "Failed to validate documents. Please ensure all images are clear and properly formatted.",
            };
        }

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