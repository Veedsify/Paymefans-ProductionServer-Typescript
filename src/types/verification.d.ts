export type StartModelVerificationResponse = {
    error: boolean;
    message: string;
    token: string | null
}

interface AwsRekognitionObject {
    bucket: string;
    key: string;
}

export interface AwsVerificationResponse {
    error: boolean;
    message: string;
    verification?: {
        front: AwsRekognitionObject,
        back: AwsRekognitionObject,
        faceVideo: AwsRekognitionObject,
    }
}

export interface ProcessVerificationProps {
    token: string;
    files: Express.Multer.File[];
    terms: boolean;
    country: string;
    documentType: string;
}

export interface AwsFaceVerificationProps {
    front: AwsRekognitionObject;
    faceVideo: AwsRekognitionObject;
}
