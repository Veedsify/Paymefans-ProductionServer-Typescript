import ModelService from "@services/ModelService";
import _ from "lodash";

// This job is no longer needed since we're using HTTP API calls
// Keeping it for backwards compatibility but removing Redis publishing
async function TriggerModels() {
  // Models are now fetched directly via HTTP API
  // This function can be safely removed or used for other purposes
  console.log("TriggerModels called - now using HTTP API instead");
  return await ModelService.GetModels({ limit: 3 });
}

export default TriggerModels;
