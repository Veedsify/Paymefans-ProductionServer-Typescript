// import query from "@utils/prisma";

export default class LoginHistoryService {
    static async SaveLoginHistory(userId: number, ip: string) {
        try {

            // const location = await ipLocation(ip) as Location

            // if(!location) {
            //     return {
            //         error: true,
            //         message: "Location Not Found",
            //     }
            // }

            // const saveLoginHistory = await query.loginHistory.create({
            //     data: {
            //         user_id: userId,
            //         country: location.country.name,
            //         location: JSON.stringify(location),
            //         city: location.city,
            //         ip_address: ip,
            //         state: location.city,
            //         longitude: location.longitude,
            //         latitude: location.latitude,
            //         device: "",
            //         capital: location.country.capital,
            //         countryCode: location.country.code,
            //         continent: location.continent.code
            //     }
            // })

            // if (saveLoginHistory) {
            //     return {
            //         error: false,
            //         message: "Location History Saved Successfully",
            //     }
            // }

            return {
                error: true,
                message: "Location History Not Saved",
            }

        } catch (e: any) {
            console.error(e);
            return {
                error: true,
                message: e.message,
            }
        }

    }
}
