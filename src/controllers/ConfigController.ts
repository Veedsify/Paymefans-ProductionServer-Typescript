import {Response} from "express";
import ConfigService from "@services/ConfigService";

export default class ConfigController {
    static async Config(_: any, res: Response): Promise<any> {
        try {
            const config = await ConfigService.Config()
            if (config.error) {
                res.status(401).json(config)
            }
            res.status(200).json(config);
        } catch (error) {
            return res.status(500).json({status: false, message: "Internal server error", error});
        }
    }
}