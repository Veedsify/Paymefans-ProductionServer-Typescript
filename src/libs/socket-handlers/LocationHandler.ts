import { Socket } from "socket.io";
import HookupService from "@services/HookupService";
import TriggerHookups from "@jobs/Hookup";
import TriggerModels from "@jobs/Models";


export default async function HandleLocationUpdate(
    socket: Socket,
    data: { latitude: number; longitude: number },
    username: string
) {
    try {
        if (!username || !data.latitude || !data.longitude) {
            return;
        }
        // Store user location
        await HookupService.UpdateUserLocation(username, data.latitude, data.longitude);
        // Get user-specific hookups based on location
        TriggerModels()
        const hookups = await TriggerHookups(username, {
            latitude: data.latitude,
            longitude: data.longitude,
        });
        // Send hookups to this specific user
        socket.emit("hookup-update", hookups);
        // Log success
        console.log(`Updated location for user ${username}`);
    } catch (error) {
        console.error("Error handling location update:", error);
    }
}