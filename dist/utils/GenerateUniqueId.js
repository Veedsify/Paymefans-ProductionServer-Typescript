"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateUniqueId = void 0;
const uuid_1 = require("uuid");
const GenerateUniqueId = () => (0, uuid_1.v4)().replace(/-/g, "");
exports.GenerateUniqueId = GenerateUniqueId;
