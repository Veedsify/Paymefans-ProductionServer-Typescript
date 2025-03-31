import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";
import { AuthUser } from "types/user";

async function TriggerHookups(id: number) {
    const hookups = await ModelService.GetModelAvailableForHookup({limit: "6"}, {id: id} as AuthUser);
    console.log("TriggerHookups", hookups);           
    redis.publish('hookups', JSON.stringify(hookups)); // Make sure this is redis, not redisSub
}

export default TriggerHookups;
