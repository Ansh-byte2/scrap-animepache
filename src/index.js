import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import AnimeMapper from './mapper.js';

console.log('Starting AniList AnimePahe Mapper API...');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mapper = new AnimeMapper();

console.log('Express app initialized and middleware configured');

// Health check endpoint
app.get('/', (req, res) => {
    console.log('Health check endpoint called');
    res.json({ status: 'ok', message: 'AniList AnimePahe Mapper API is running' });
});

// Get episodes from AniList ID
app.get('/api/:aniListId', async (req, res) => {
    try {
        const { aniListId } = req.params;
        console.log(`Request received for AniList ID: ${aniListId}`);
        
        if (!aniListId) {
            console.log('AniList ID is missing from request');
            return res.status(400).json({ error: 'AniList ID is required' });
        }

        console.log(`Fetching episodes for AniList ID: ${aniListId}`);
        const episodes = await mapper.getEpisodesFromAniListId(parseInt(aniListId));
        console.log(`Successfully fetched episodes for AniList ID: ${aniListId}`);
        res.json(episodes);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(error.message.includes('not found') ? 404 : 500)
           .json({ error: error.message });
    }
});

// Get episode sources
app.get('/api/watch/:anilistID/:episodeNum', async (req, res) => {
    try {
        const { anilistID, episodeNum } = req.params;
        console.log(`Request received for episode sources - AniList ID: ${anilistID}, Episode: ${episodeNum}`);
        
        const sources = await mapper.getEpisodeSources(anilistID, episodeNum);
        console.log(`Successfully fetched sources for AniList ID: ${anilistID}, Episode: ${episodeNum}`);
        res.json(sources);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to get episode sources' });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    console.log(`Starting server in development mode on port ${port}`);
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// For Vercel
console.log('Exporting app for Vercel deployment');
export default app;
