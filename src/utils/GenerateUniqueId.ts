import { v4 as uuid } from "uuid";
export const GenerateUniqueId = () => uuid().replace(/-/g, "");