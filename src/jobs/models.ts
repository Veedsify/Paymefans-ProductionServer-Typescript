import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";
import type { AuthUser } from "types/user";
import _ from "lodash";

async function TriggerModels(id: number) {
    const models = await ModelService.GetModels({limit: 3}, {id: id} as AuthUser)
    redis.publish('models', JSON.stringify(models)); // Make sure this is redis, not redisSub
}

export default TriggerModels;
