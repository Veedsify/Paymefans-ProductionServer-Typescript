import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";
import { AuthUser } from "types/user";

async function TriggerModels(id: number) {
    const models = await ModelService.GetModels({limit: 3}, {id: id} as AuthUser);
    console.log("TriggerModels", models);
    redis.publish('models', JSON.stringify(models)); // Make sure this is redis, not redisSub
}

export default TriggerModels;
