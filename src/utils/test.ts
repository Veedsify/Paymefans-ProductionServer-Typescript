import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";

async function TestPubSub(_: number) {
      const models = await ModelService.GetModels({ limit: 6 })
      console.log(models)
      redis.publish('models', JSON.stringify(models));
}
TestPubSub(2)
