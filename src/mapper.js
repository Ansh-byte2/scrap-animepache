import AniListClient from './clients/anilist.js';
import AnimePaheClient from './clients/animepahe.js';

console.log('Initializing AnimeMapper class...');

class AnimeMapper {
    constructor() {
        console.log('Creating AniListClient instance');
        this.aniList = new AniListClient();
        console.log('Creating AnimePaheClient instance');
        this.animePahe = new AnimePaheClient();
        console.log('AnimeMapper instance created successfully');
    }

    async getEpisodesFromAniListId(aniListId) {
        console.log(`Starting episode mapping for AniList ID: ${aniListId}`);
        
        try {
            // Get anime title from AniList
            console.log(`Fetching anime title from AniList for ID: ${aniListId}`);
            const animeTitle = await this.aniList.getAnimeTitle(aniListId);
            if (!animeTitle) {
                console.log(`Anime not found on AniList for ID: ${aniListId}`);
                throw new Error('Anime not found on AniList');
            }
            console.log(`Found anime title: ${animeTitle}`);

            // Search AnimePahe for the anime
            console.log(`Searching AnimePahe for anime: ${animeTitle}`);
            const searchResults = await this.animePahe.searchAnime(animeTitle);
            if (!searchResults || searchResults.length === 0) {
                console.log(`No results found on AnimePahe for: ${animeTitle}`);
                throw new Error('Anime not found on AnimePahe');
            }
            console.log(`Found ${searchResults.length} results on AnimePahe`);

            // Find the best match from search results
            console.log('Finding best match from search results');
            const bestMatch = this._findBestMatch(animeTitle, searchResults);
            if (!bestMatch) {
                console.log('No matching anime found on AnimePahe');
                throw new Error('No matching anime found on AnimePahe');
            }
            console.log(`Best match found: ${bestMatch.name}`);

            // Get episodes from AnimePahe
            console.log(`Fetching episodes from AnimePahe for ID: ${bestMatch.id}`);
            const episodes = await this.animePahe.getEpisodes(bestMatch.id);
            
            console.log(`Successfully mapped AniList ID ${aniListId} to AnimePahe ID ${bestMatch.id}`);
            
            return {
                aniListId: aniListId,
                animePaheId: bestMatch.id,
                title: episodes.title,
                totalEpisodes: episodes.totalEpisodes,
                episodes: episodes.episodes.map(ep => ({
                    number: ep.number,
                    id: ep.episodeId,
                    title: ep.title,
                    image: ep.image
                }))
            };
        } catch (error) {
            console.error('Error mapping AniList to AnimePahe:', error);
            throw error;
        }
    }

    async getEpisodeSources(anilistID, episodeNum) {
        console.log(`Starting episode sources fetch for AniList ID: ${anilistID}, Episode: ${episodeNum}`);
        
        try {
            // Get anime title from AniList
            console.log(`Fetching anime title from AniList for ID: ${anilistID}`);
            const animeTitle = await this.aniList.getAnimeTitle(parseInt(anilistID));
            if (!animeTitle) {
                console.log(`Anime not found on AniList for ID: ${anilistID}`);
                throw new Error('Anime not found on AniList');
            }
            console.log(`Found anime title: ${animeTitle}`);

            // Search AnimePahe for the anime
            console.log(`Searching AnimePahe for anime: ${animeTitle}`);
            const searchResults = await this.animePahe.searchAnime(animeTitle);
            if (!searchResults || searchResults.length === 0) {
                console.log(`No results found on AnimePahe for: ${animeTitle}`);
                throw new Error('Anime not found on AnimePahe');
            }
            console.log(`Found ${searchResults.length} results on AnimePahe`);

            // Find the best match from search results
            console.log('Finding best match from search results');
            const bestMatch = this._findBestMatch(animeTitle, searchResults);
            if (!bestMatch) {
                console.log('No matching anime found on AnimePahe');
                throw new Error('No matching anime found on AnimePahe');
            }
            console.log(`Best match found: ${bestMatch.name}`);

            // Get episodes from AnimePahe
            console.log(`Fetching episodes from AnimePahe for ID: ${bestMatch.id}`);
            const episodes = await this.animePahe.getEpisodes(bestMatch.id);
            
            // Find the specific episode
            console.log(`Looking for episode number: ${episodeNum}`);
            const episode = episodes.episodes.find(ep => ep.number === parseInt(episodeNum));
            if (!episode) {
                console.log(`Episode ${episodeNum} not found`);
                throw new Error(`Episode ${episodeNum} not found`);
            }
            console.log(`Found episode: ${episode.title} (ID: ${episode.episodeId})`);

            // Get sources for this episode
            console.log(`Fetching sources for episode ID: ${episode.episodeId}`);
            const sources = await this.animePahe.getEpisodeSources(episode.episodeId);
            console.log(`Successfully fetched sources for episode ${episodeNum}`);
            
            return sources;
        } catch (error) {
            console.error('Error getting episode sources:', error);
            throw error;
        }
    }

    _findBestMatch(title, searchResults) {
        console.log(`Finding best match for title: ${title}`);
        const normalizedTitle = title.toLowerCase().trim();
        console.log(`Normalized title: ${normalizedTitle}`);
        
        const exactMatch = searchResults.find(result => 
            result.name.toLowerCase().trim() === normalizedTitle
        );
        
        if (exactMatch) {
            console.log(`Exact match found: ${exactMatch.name}`);
            return exactMatch;
        }
        
        console.log('No exact match found, using first result as fallback');
        return searchResults[0]; // Fallback to first result if no exact match
    }
}

console.log('AnimeMapper class definition completed');

export default AnimeMapper; 