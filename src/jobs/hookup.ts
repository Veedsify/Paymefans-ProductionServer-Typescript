import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";
import type { AuthUser } from "types/user";
import _ from "lodash";

async function TriggerHookups(id: number) {
    const hookups = await ModelService.GetModelAvailableForHookup({limit: "6"}, {id: id} as AuthUser);
    redis.publish('hookups', JSON.stringify(hookups)); // Make sure this is redis, not redisSub
}

export default TriggerHookups;
