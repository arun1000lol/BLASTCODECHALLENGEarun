import { Request, Response } from 'express';
import { CSGOLogParser } from '../parsers/csgoLogParser';
import path from 'path';
import fs from 'fs';

// started off with where i would use multer to upload the text file and then it would show it. 
// scrapped it after but name stays
export const uploadLog = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    
    const filePath = req.file.path;
    const parser = new CSGOLogParser(filePath);
    const matchData = await parser.parseFile();
    
    res.status(200).json(matchData);
  } catch (error) {
    console.error('Error processing log file:', error);
    res.status(500).json({ error: 'Failed to process log file' });
  }
};

export const getPreloadedMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if the preloaded match file exists
    const filePath = path.join(__dirname, '../../uploads/NAVIvsVitaGF-Nuke.txt');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Preloaded match file not found' });
      return;
    }
    
    const parser = new CSGOLogParser(filePath);
    const matchData = await parser.parseFile();
    
    res.status(200).json(matchData);
  } catch (error) {
    console.error('Error processing preloaded match:', error);
    res.status(500).json({ error: 'Failed to process preloaded match' });
  }
};