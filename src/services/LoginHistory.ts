import ipLocation from 'iplocation';
import query from "@utils/prisma";

interface Location {
    city: string;
    longitude: number;
    latitude: number;
    country: {
        name: string;
        code: string;
        iso3: string;
        capital: string;
        tld: string;
    }
    continent: {
        code: string;
    }
}

export default class LoginHistoryService {
    static async SaveLoginHistory(userId: number, ip: string) {
        try {

            const location = await ipLocation(ip) as Location

            console.log("location", location)

            const saveLoginHistory = await query.loginHistory.create({
                data: {
                    user_id: userId,
                    country: location.country.name,
                    location: JSON.stringify(location),
                    city: location.city,
                    ip_address: ip,
                    state: location.city,
                    longitude: location.longitude,
                    latitude: location.latitude,
                    device: "",
                    capital: location.country.capital,
                    countryCode: location.country.code,
                    continent: location.continent.code
                }
            })

            if (saveLoginHistory) {
                return {
                    error: false,
                    message: "Location History Saved Successfully",
                }
            }

            return {
                error: true,
                message: "Location History Not Saved",
            }

        } catch (e: any) {
            console.error(e);
            throw new Error(e.message);
        }

    }
}
