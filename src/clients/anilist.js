import { GraphQLClient } from 'graphql-request';

console.log('Initializing AniListClient class...');

class AniListClient {
    constructor() {
        console.log('Creating GraphQL client for AniList API');
        this.client = new GraphQLClient('https://graphql.anilist.co');
        console.log('AniListClient instance created successfully');
    }

    async searchAnime(query) {
        console.log(`Searching AniList for anime: ${query}`);
        
        const searchQuery = `
            query ($search: String) {
                Page(page: 1, perPage: 8) {
                    media(search: $search, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                            native
                        }
                        coverImage {
                            large
                        }
                        episodes
                        status
                    }
                }
            }
        `;

        try {
            console.log('Sending GraphQL request to AniList API');
            const response = await this.client.request(searchQuery, { search: query });
            console.log(`Found ${response.Page.media.length} results on AniList`);
            
            const results = response.Page.media.map(anime => ({
                id: anime.id,
                title: anime.title.romaji || anime.title.english,
                alternativeTitles: {
                    english: anime.title.english,
                    native: anime.title.native
                },
                coverImage: anime.coverImage.large,
                episodes: anime.episodes,
                status: anime.status
            }));
            
            console.log('Successfully processed AniList search results');
            return results;
        } catch (error) {
            console.error('AniList search error:', error);
            throw error;
        }
    }

    async getAnimeDetails(id) {
        console.log(`Fetching anime details from AniList for ID: ${id}`);
        
        const detailsQuery = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    coverImage {
                        large
                    }
                    episodes
                    status
                    description
                    genres
                    averageScore
                    season
                    seasonYear
                }
            }
        `;

        try {
            console.log(`Sending GraphQL request for anime details (ID: ${id})`);
            const response = await this.client.request(detailsQuery, { id: parseInt(id) });
            
            const details = {
                id: response.Media.id,
                title: response.Media.title.romaji || response.Media.title.english,
                alternativeTitles: {
                    english: response.Media.title.english,
                    native: response.Media.title.native
                },
                coverImage: response.Media.coverImage.large,
                episodes: response.Media.episodes,
                status: response.Media.status,
                description: response.Media.description,
                genres: response.Media.genres,
                score: response.Media.averageScore,
                season: response.Media.season,
                seasonYear: response.Media.seasonYear
            };
            
            console.log(`Successfully fetched details for anime ID: ${id}`);
            return details;
        } catch (error) {
            console.error('AniList details error:', error);
            throw error;
        }
    }

    async getAnimeTitle(id) {
        console.log(`Fetching anime title from AniList for ID: ${id}`);
        
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    title {
                        romaji
                        english
                        native
                    }
                }
            }
        `;

        try {
            console.log(`Sending GraphQL request for anime title (ID: ${id})`);
            const response = await this.client.request(query, { id: parseInt(id) });
            
            const title = response.Media.title.romaji || response.Media.title.english || response.Media.title.native;
            console.log(`Successfully fetched title for anime ID ${id}: ${title}`);
            
            return title;
        } catch (error) {
            console.error('AniList title fetch error:', error);
            throw error;
        }
    }
}

console.log('AniListClient class definition completed');

export default AniListClient; 