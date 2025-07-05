/**
 * Name Matching Service
 * Provides fuzzy name matching between user signup names and extracted ID names
 */

export interface NameMatchResult {
    isMatch: boolean;
    confidence: number;
    details: {
        firstNameMatch: boolean;
        lastNameMatch: boolean;
        fullNameMatch: boolean;
        extractedNames: string[];
        userNames: string[];
    };
}

export class NameMatchingService {
    /**
     * Normalize a name by removing extra spaces, converting to lowercase, 
     * and removing common prefixes/suffixes
     */
    private static normalizeName(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/^(mr|mrs|miss|dr|prof|sir|lady|lord)\s+/i, '') // Remove titles
            .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '') // Remove suffixes
            .replace(/[^\w\s]/g, '') // Remove special characters
            .trim();
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     */
    private static calculateSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;

        const matrix: number[][] = [];

        // Initialize matrix
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return (maxLen - matrix[len1][len2]) / maxLen;
    }

    /**
     * Check if names are similar enough to be considered a match
     */
    private static isNameSimilar(name1: string, name2: string, threshold: number = 0.8): boolean {
        const normalized1 = this.normalizeName(name1);
        const normalized2 = this.normalizeName(name2);

        // Exact match after normalization
        if (normalized1 === normalized2) return true;

        // Check if one name contains the other (for partial matches)
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            return true;
        }

        // Calculate similarity score
        const similarity = this.calculateSimilarity(normalized1, normalized2);
        return similarity >= threshold;
    }

    /**
     * Extract individual names from a full name string
     */
    private static extractNames(fullName: string): string[] {
        return this.normalizeName(fullName)
            .split(' ')
            .filter(name => name.length > 1); // Filter out single letters
    }

    /**
     * Match extracted ID names against user signup names
     * @param userFirstName - User's first name from signup
     * @param userLastName - User's last name from signup  
     * @param userFullName - User's full name from signup
     * @param extractedNames - Names extracted from ID document
     * @param strictness - Matching strictness (0.6 = loose, 0.8 = normal, 0.9 = strict)
     */
    static matchNames(
        userFirstName: string,
        userLastName: string,
        userFullName: string,
        extractedNames: string[],
        strictness: number = 0.8
    ): NameMatchResult {

        const userNames = [
            this.normalizeName(userFirstName),
            this.normalizeName(userLastName),
            ...this.extractNames(userFullName)
        ].filter(name => name.length > 1);

        const normalizedExtractedNames = extractedNames
            .map(name => this.normalizeName(name))
            .filter(name => name.length > 1);

        let firstNameMatch = false;
        let lastNameMatch = false;
        let fullNameMatch = false;
        let totalMatches = 0;
        let totalComparisons = 0;

        // Check first name matches
        const normalizedFirstName = this.normalizeName(userFirstName);
        for (const extractedName of normalizedExtractedNames) {
            totalComparisons++;
            if (this.isNameSimilar(normalizedFirstName, extractedName, strictness)) {
                firstNameMatch = true;
                totalMatches++;
                break;
            }
        }

        // Check last name matches
        const normalizedLastName = this.normalizeName(userLastName);
        for (const extractedName of normalizedExtractedNames) {
            totalComparisons++;
            if (this.isNameSimilar(normalizedLastName, extractedName, strictness)) {
                lastNameMatch = true;
                totalMatches++;
                break;
            }
        }

        // Check full name combinations
        const normalizedFullName = this.normalizeName(userFullName);
        const extractedFullName = normalizedExtractedNames.join(' ');
        if (this.isNameSimilar(normalizedFullName, extractedFullName, strictness * 0.9)) {
            fullNameMatch = true;
            totalMatches++;
        }

        // Calculate confidence based on matches
        let confidence = 0;
        if (firstNameMatch && lastNameMatch) {
            confidence = 0.95; // Very high confidence if both first and last name match
        } else if (fullNameMatch) {
            confidence = 0.85; // High confidence if full name matches
        } else if (firstNameMatch || lastNameMatch) {
            confidence = 0.65; // Medium confidence if only one name matches
        } else {
            // Check for any partial matches
            let partialMatches = 0;
            for (const userName of userNames) {
                for (const extractedName of normalizedExtractedNames) {
                    if (this.isNameSimilar(userName, extractedName, strictness * 0.7)) {
                        partialMatches++;
                    }
                }
            }
            confidence = Math.min(partialMatches * 0.3, 0.6); // Low confidence for partial matches
        }

        // Determine if it's a match (need at least one name match or high partial match confidence)
        const isMatch = firstNameMatch || lastNameMatch || fullNameMatch || confidence >= 0.5;

        return {
            isMatch,
            confidence,
            details: {
                firstNameMatch,
                lastNameMatch,
                fullNameMatch,
                extractedNames: normalizedExtractedNames,
                userNames
            }
        };
    }
}
