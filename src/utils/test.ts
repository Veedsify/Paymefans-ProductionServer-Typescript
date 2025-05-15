import { redis } from "@libs/RedisStore";
import ModelService from "@services/ModelService";
import type{ AuthUser } from "types/user";

async function TestPubSub (id: number){
      const models = await ModelService.GetModels({limit: 6}, {id: id} as AuthUser)
      console.log(models)
      redis.publish('models', JSON.stringify(models));
}
TestPubSub(2)
