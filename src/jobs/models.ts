import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";
import _ from "lodash";

async function TriggerModels() {
    const models = await ModelService.GetModels({ limit: 3 })
    redis.publish('models', JSON.stringify(models)); // Make sure this is redis, not redisSub
}

export default TriggerModels;
