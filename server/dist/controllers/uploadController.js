"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreloadedMatch = exports.uploadLog = void 0;
const csgoLogParser_1 = require("../parsers/csgoLogParser");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// started off with where i would use multer to upload the text file and then it would show it. 
// scrapped it after but name stays
const uploadLog = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const filePath = req.file.path;
        const parser = new csgoLogParser_1.CSGOLogParser(filePath);
        const matchData = await parser.parseFile();
        res.status(200).json(matchData);
    }
    catch (error) {
        console.error('Error processing log file:', error);
        res.status(500).json({ error: 'Failed to process log file' });
    }
};
exports.uploadLog = uploadLog;
const getPreloadedMatch = async (req, res) => {
    try {
        // Check if the preloaded match file exists
        const filePath = path_1.default.join(__dirname, '../../uploads/NAVIvsVitaGF-Nuke.txt');
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ error: 'Preloaded match file not found' });
            return;
        }
        const parser = new csgoLogParser_1.CSGOLogParser(filePath);
        const matchData = await parser.parseFile();
        res.status(200).json(matchData);
    }
    catch (error) {
        console.error('Error processing preloaded match:', error);
        res.status(500).json({ error: 'Failed to process preloaded match' });
    }
};
exports.getPreloadedMatch = getPreloadedMatch;
