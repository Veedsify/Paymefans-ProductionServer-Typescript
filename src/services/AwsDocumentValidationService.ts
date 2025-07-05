// Note: AWS Textract might need to be installed separately
// For now, we'll use Rekognition's text detection as fallback
import {
    RekognitionClient,
    DetectTextCommand,
    DetectModerationLabelsCommand,
    DetectFacesCommand,
} from "@aws-sdk/client-rekognition";
import type { AwsRekognitionObject } from "../types/verification";

const {
    AWS_REGION,
    AWS_ACCESS_KEY,
    AWS_SECRET_KEY,
    AWS_MIN_TEXT_CONFIDENCE = "80",
} = process.env;

interface IDValidationResult {
    error: boolean;
    message: string;
    extractedData?: {
        textConfidence: number;
        detectedTexts: string[];
        hasRequiredFields: boolean;
        documentQuality: 'good' | 'fair' | 'poor';
    };
}

interface DocumentQualityResult {
    error: boolean;
    message: string;
    quality?: {
        blur: boolean;
        brightness: boolean;
        contrast: boolean;
        text_quality: boolean;
        overall_score: number;
    };
}

const rekognitionClient = new RekognitionClient({
    region: AWS_REGION as string,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY as string,
        secretAccessKey: AWS_SECRET_KEY as string,
    },
});

// Common patterns for different countries' ID documents
const ID_PATTERNS = {
    nigeria: {
        national_id: [/\d{11}/, /NIN/i, /NIGERIA/i, /FEDERAL REPUBLIC/i],
        passport: [/[A-Z]\d{8}/, /PASSPORT/i, /NIGERIA/i],
        drivers_license: [/[A-Z]{3}\d{9}[A-Z]{2}/, /DRIVER/i, /LICENSE/i]
    },
    ghana: {
        national_id: [/GHA-\d{9}-\d/, /GHANA/i, /NATIONAL/i, /IDENTITY/i],
        passport: [/G\d{7}/, /PASSPORT/i, /GHANA/i],
        drivers_license: [/\d{8}/, /DRIVER/i, /LICENSE/i]
    },
    kenya: {
        national_id: [/\d{8}/, /KENYA/i, /NATIONAL/i, /IDENTITY/i],
        passport: [/[A-Z]\d{7}/, /PASSPORT/i, /KENYA/i],
        drivers_license: [/\d{8}/, /DRIVER/i, /LICENSE/i]
    }
};

/**
 * Validates ID documents using AWS Rekognition text detection
 */
export const validateIDDocument = async (
    document: AwsRekognitionObject,
    expectedCountry: string,
    documentType: string
): Promise<IDValidationResult> => {
    try {
        const command = new DetectTextCommand({
            Image: {
                S3Object: {
                    Bucket: document.bucket,
                    Name: document.key,
                },
            },
        });

        const response = await rekognitionClient.send(command);
        const textDetections = response.TextDetections || [];

        if (textDetections.length < 3) {
            return {
                error: true,
                message: "Unable to detect sufficient text in the document. Please ensure the document is clear and well-lit.",
            };
        }

        // Extract all detected text
        const detectedTexts: string[] = [];
        let totalConfidence = 0;
        let validTextCount = 0;

        textDetections.forEach((detection) => {
            if (detection.Type === 'LINE' && detection.DetectedText && detection.Confidence) {
                if (detection.Confidence >= Number(AWS_MIN_TEXT_CONFIDENCE)) {
                    detectedTexts.push(detection.DetectedText.toUpperCase());
                    totalConfidence += detection.Confidence;
                    validTextCount++;
                }
            }
        });

        if (validTextCount === 0) {
            return {
                error: true,
                message: "Text quality is too poor for verification. Please ensure good lighting and avoid shadows.",
            };
        }

        const avgConfidence = totalConfidence / validTextCount;
        const allText = detectedTexts.join(' ');

        // Validate country and document type patterns
        const countryPatterns = ID_PATTERNS[expectedCountry.toLowerCase() as keyof typeof ID_PATTERNS];
        if (!countryPatterns) {
            return {
                error: true,
                message: `Document validation for ${expectedCountry} is not yet supported.`,
            };
        }

        const normalizedDocType = documentType.toLowerCase().replace(/\s+/g, '_');
        const docTypePatterns = countryPatterns[normalizedDocType as keyof typeof countryPatterns];
        if (!docTypePatterns) {
            return {
                error: true,
                message: `${documentType} validation for ${expectedCountry} is not yet supported.`,
            };
        }

        // Check if document matches expected patterns
        let patternMatches = 0;
        docTypePatterns.forEach((pattern) => {
            if (pattern.test(allText)) {
                patternMatches++;
            }
        });

        const hasRequiredFields = patternMatches >= Math.ceil(docTypePatterns.length * 0.6);

        if (!hasRequiredFields) {
            return {
                error: true,
                message: `This document does not appear to be a valid ${documentType} from ${expectedCountry}. Please ensure you're uploading the correct document type.`,
            };
        }

        // Determine document quality
        let documentQuality: 'good' | 'fair' | 'poor' = 'poor';
        if (avgConfidence >= 90) {
            documentQuality = 'good';
        } else if (avgConfidence >= 75) {
            documentQuality = 'fair';
        }

        if (documentQuality === 'poor') {
            return {
                error: true,
                message: "Document quality is insufficient for verification. Please retake the photo with better lighting and ensure all text is clearly visible.",
            };
        }

        return {
            error: false,
            message: "Document validation successful",
            extractedData: {
                textConfidence: avgConfidence,
                detectedTexts: detectedTexts.slice(0, 5), // Limit for privacy
                hasRequiredFields,
                documentQuality,
            },
        };
    } catch (error: any) {
        console.error("ID validation error:", error);
        return {
            error: true,
            message: "Failed to validate document. Please ensure the image is clear and try again.",
        };
    }
};

/**
 * Analyzes document quality using AWS Rekognition
 */
export const analyzeDocumentQuality = async (
    document: AwsRekognitionObject
): Promise<DocumentQualityResult> => {
    try {
        // Detect text to analyze quality
        const textCommand = new DetectTextCommand({
            Image: {
                S3Object: {
                    Bucket: document.bucket,
                    Name: document.key,
                },
            },
        });

        const moderationCommand = new DetectModerationLabelsCommand({
            Image: {
                S3Object: {
                    Bucket: document.bucket,
                    Name: document.key,
                },
            },
            MinConfidence: 60,
        });

        const [textResponse, moderationResponse] = await Promise.all([
            rekognitionClient.send(textCommand),
            rekognitionClient.send(moderationCommand),
        ]);

        // Check for inappropriate content
        if (moderationResponse.ModerationLabels && moderationResponse.ModerationLabels.length > 0) {
            const inappropriateLabels = moderationResponse.ModerationLabels.filter(
                label => (label.Confidence || 0) > 70
            );

            if (inappropriateLabels.length > 0) {
                return {
                    error: true,
                    message: "Document contains inappropriate content. Please provide a valid government-issued ID.",
                };
            }
        }

        const textDetections = textResponse.TextDetections || [];

        if (textDetections.length < 5) {
            return {
                error: true,
                message: "Document quality is too poor. Please ensure the image is clear, well-lit, and all text is readable.",
            };
        }

        // Analyze text quality
        let totalConfidence = 0;
        let lowConfidenceCount = 0;
        let lineCount = 0;

        textDetections.forEach(detection => {
            if (detection.Type === 'LINE' && detection.Confidence) {
                totalConfidence += detection.Confidence;
                lineCount++;
                if (detection.Confidence < 80) {
                    lowConfidenceCount++;
                }
            }
        });

        if (lineCount === 0) {
            return {
                error: true,
                message: "No readable text found in document. Please ensure the document is clearly visible.",
            };
        }

        const avgConfidence = totalConfidence / lineCount;
        const lowConfidenceRatio = lowConfidenceCount / lineCount;

        const quality = {
            blur: avgConfidence > 75,
            brightness: true, // Would need additional analysis
            contrast: true,   // Would need additional analysis  
            text_quality: lowConfidenceRatio < 0.3,
            overall_score: avgConfidence,
        };

        if (avgConfidence < 70 || lowConfidenceRatio > 0.5) {
            return {
                error: true,
                message: "Document image quality is insufficient. Please ensure good lighting, avoid blur, and capture the entire document clearly.",
                quality,
            };
        }

        return {
            error: false,
            message: "Document quality is acceptable",
            quality,
        };
    } catch (error: any) {
        console.error("Document quality analysis error:", error);
        return {
            error: true,
            message: "Failed to analyze document quality. Please try again with a clearer image.",
        };
    }
};

/**
 * Enhanced face detection for liveness check
 */
export const detectFaceQuality = async (
    image: AwsRekognitionObject
): Promise<{ error: boolean; message: string; faceData?: any }> => {
    try {
        const command = new DetectFacesCommand({
            Image: {
                S3Object: {
                    Bucket: image.bucket,
                    Name: image.key,
                },
            },
            Attributes: ['ALL'],
        });

        const response = await rekognitionClient.send(command);

        if (!response.FaceDetails || response.FaceDetails.length === 0) {
            return {
                error: true,
                message: "No face detected in the image. Please ensure your face is clearly visible and well-lit.",
            };
        }

        if (response.FaceDetails.length > 1) {
            return {
                error: true,
                message: "Multiple faces detected. Please ensure only your face is visible in the image.",
            };
        }

        const face = response.FaceDetails[0];
        const confidence = face.Confidence || 0;

        if (confidence < 85) {
            return {
                error: true,
                message: "Face detection confidence is too low. Please ensure good lighting and face the camera directly.",
            };
        }

        // Check face quality attributes
        const pose = face.Pose;
        const quality = face.Quality;

        if (pose) {
            if (Math.abs(pose.Yaw || 0) > 30 || Math.abs(pose.Pitch || 0) > 30 || Math.abs(pose.Roll || 0) > 30) {
                return {
                    error: true,
                    message: "Please face the camera directly. Avoid tilting your head too much.",
                };
            }
        }

        if (quality) {
            if ((quality.Brightness || 0) < 30) {
                return {
                    error: true,
                    message: "Image is too dark. Please ensure proper lighting.",
                };
            }

            if ((quality.Sharpness || 0) < 30) {
                return {
                    error: true,
                    message: "Image is too blurry. Please hold the camera steady and ensure proper focus.",
                };
            }
        }

        // Check for sunglasses, mouth open, etc.
        const eyesOpen = face.EyesOpen?.Value;
        const sunglasses = face.Sunglasses?.Value;

        if (sunglasses) {
            return {
                error: true,
                message: "Please remove sunglasses for verification.",
            };
        }

        if (!eyesOpen) {
            return {
                error: true,
                message: "Please keep your eyes open during verification.",
            };
        }

        return {
            error: false,
            message: "Face quality is acceptable",
            faceData: face,
        };
    } catch (error: any) {
        console.error("Face quality detection error:", error);
        return {
            error: true,
            message: "Failed to analyze face quality. Please try again.",
        };
    }
};

/**
 * Extract potential names from detected text on ID documents
 * This uses common patterns to identify name fields
 */
export const extractNamesFromDocument = (detectedTexts: string[], country: string): string[] => {
    const extractedNames: string[] = [];

    // Common name field indicators for different countries
    const nameIndicators = [
        'NAME', 'NAMES', 'FULL NAME', 'GIVEN NAME', 'SURNAME', 'FIRST NAME', 'LAST NAME',
        'NOME', 'APELLIDO', 'PRENOM', 'NOM', 'FIRSTNAME', 'LASTNAME',
        'GIVEN NAMES', 'FAMILY NAME'
    ];

    // Nigerian-specific patterns
    if (country.toLowerCase() === 'nigeria') {
        nameIndicators.push('NAMES:', 'NAME:', 'FULL NAME:', 'GIVEN NAME:', 'SURNAME:');
    }

    // Ghanaian-specific patterns  
    if (country.toLowerCase() === 'ghana') {
        nameIndicators.push('FULL NAME:', 'SURNAME:', 'OTHER NAMES:');
    }

    for (let i = 0; i < detectedTexts.length; i++) {
        const currentText = detectedTexts[i].toUpperCase();

        // Check if current text is a name indicator
        const isNameIndicator = nameIndicators.some(indicator =>
            currentText.includes(indicator) || currentText === indicator
        );

        if (isNameIndicator) {
            // Look for names in the next few lines
            for (let j = i + 1; j < Math.min(i + 4, detectedTexts.length); j++) {
                const potentialName = detectedTexts[j].trim();

                // Basic validation: should be mostly letters, reasonable length
                if (potentialName.length >= 2 && potentialName.length <= 50) {
                    const isValidName = /^[A-Za-z\s'-]+$/.test(potentialName);
                    const hasMultipleWords = potentialName.split(/\s+/).length >= 1;

                    if (isValidName && hasMultipleWords) {
                        // Split into individual names and add them
                        const individualNames = potentialName.split(/\s+/)
                            .filter(name => name.length > 1)
                            .map(name => name.trim());

                        extractedNames.push(...individualNames);
                        break; // Found names for this indicator, move to next
                    }
                }
            }
        }

        // Also check if current line itself contains names (without explicit indicators)
        const currentLine = detectedTexts[i].trim();
        if (currentLine.length >= 4 && currentLine.length <= 100) {
            const words = currentLine.split(/\s+/);

            // If line has 2-4 words, all letters, might be a name line
            if (words.length >= 2 && words.length <= 4) {
                const allWordsValid = words.every(word =>
                    /^[A-Za-z'-]+$/.test(word) && word.length > 1
                );

                if (allWordsValid) {
                    extractedNames.push(...words);
                }
            }
        }
    }

    // Remove duplicates and filter out common non-name words
    const commonNonNames = [
        'FEDERAL', 'REPUBLIC', 'NIGERIA', 'GHANA', 'GOVERNMENT', 'ISSUED', 'DATE',
        'DOB', 'SEX', 'HEIGHT', 'SIGNATURE', 'CARD', 'IDENTITY', 'NATIONAL',
        'INTERNATIONAL', 'PASSPORT', 'DRIVER', 'LICENSE', 'PERMIT', 'VALID',
        'EXPIRES', 'EXPIRY', 'MALE', 'FEMALE', 'STATE', 'LGA', 'ADDRESS'
    ];

    return [...new Set(extractedNames)]
        .filter(name =>
            !commonNonNames.includes(name.toUpperCase()) &&
            name.length > 1 &&
            name.length < 30
        );
};

export type { IDValidationResult, DocumentQualityResult };
