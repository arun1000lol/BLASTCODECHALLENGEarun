"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controllers/uploadController");
const router = express_1.default.Router();
// only one route 
// in the future i would like to add more routes for specific data 
// cause right now it gets all the data at once and that strains the performance and server when running for the first time
router.get('/match/preloaded', uploadController_1.getPreloadedMatch);
exports.default = router;
