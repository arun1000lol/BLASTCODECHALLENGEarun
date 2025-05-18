import express from 'express';
import {getPreloadedMatch } from '../controllers/uploadController';

const router = express.Router();




// only one route 
// in the future i would like to add more routes for specific data 
// cause right now it gets all the data at once and that strains the performance and server when running for the first time
router.get('/match/preloaded', getPreloadedMatch);

export default router;