import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

console.log('Initializing AnimePaheClient class...');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

class AnimePaheClient {
    constructor() {
        console.log('Initializing AnimePaheClient with base URL: https://animepahe.si');
        this.baseUrl = 'https://animepahe.si';
        console.log('AnimePaheClient instance created successfully');
    }

    getHeaders(sessionId = false) {
        console.log(`Generating headers for session: ${sessionId || 'no session'}`);
        const headers = {
            'authority': 'animepahe.si',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            'cookie': '__ddg2_=;',
            'dnt': '1',
            'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-requested-with': 'XMLHttpRequest',
            'referer': sessionId ? `${this.baseUrl}/anime/${sessionId}` : this.baseUrl,
            'user-agent': USER_AGENT
        };
        console.log('Headers generated successfully');
        return headers;
    }

    async _makeRequest(url, options = {}) {
        console.log(`Making request to: ${url}`);
        console.log(`Request options: ${JSON.stringify(options, null, 2)}`);
        
        const defaultOptions = {
            headers: this.getHeaders(options.sessionId),
            redirect: 'follow',
            follow: 20,
            timeout: 10000
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        console.log('Sending HTTP request...');
        let response = await fetch(url, finalOptions);
        
        if (response.status === 403) {
            console.log('Received 403 Forbidden, trying with different user agent');
            // Try with a different user agent
            finalOptions.headers['user-agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
            response = await fetch(url, finalOptions);
        }

        if (!response.ok) {
            console.error(`Request failed with status ${response.status}`);
            throw new Error(`Request failed with status ${response.status}`);
        }

        console.log('Request successful');
        return response;
    }

    async searchAnime(query) {
        console.log(`Searching AnimePahe for: ${query}`);
        
        try {
            console.log('Making search request to AnimePahe API');
            const response = await this._makeRequest(`${this.baseUrl}/api?m=search&l=8&q=${encodeURIComponent(query)}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('Parsing search response JSON');
            const data = await response.json();
            
            if (!data.data || !Array.isArray(data.data)) {
                console.log('No valid data found in search response');
                return [];
            }

            console.log(`Found ${data.data.length} results on AnimePahe`);
            
            const results = data.data.map(item => ({
                name: item.title,
                poster: item.poster,
                id: `${item.id}-${item.title}`,
                episodes: {
                    sub: item.episodes,
                    dub: '??'
                },
                rating: item.score,
                releaseDate: item.year,
                type: item.type
            }));
            
            console.log('Successfully processed AnimePahe search results');
            return results;
        } catch (error) {
            console.error('AnimePahe search error:', error);
            return [];
        }
    }

    async getEpisodes(animeId) {
        console.log(`Fetching episodes for AnimePahe ID: ${animeId}`);
        
        try {
            const [id, title] = animeId.split('-');
            console.log(`Extracted anime ID: ${id}, title: ${title}`);
            
            console.log('Getting session for anime');
            const session = await this._getSession(title, id);
            console.log(`Session obtained: ${session}`);
            
            console.log('Fetching all episodes for session');
            const episodes = await this._fetchAllEpisodes(session);
            console.log(`Successfully fetched ${episodes.episodes.length} episodes`);
            
            return episodes;
        } catch (error) {
            console.error('AnimePahe episodes error:', error);
            throw error;
        }
    }

    async _getSession(title, animeId) {
        console.log(`Getting session for title: ${title}, anime ID: ${animeId}`);
        
        const response = await this._makeRequest(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(title)}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Parsing session search response');
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            console.error('Invalid search response structure');
            throw new Error('Invalid search response');
        }

        console.log(`Found ${data.data.length} potential matches`);
        
        const session = data.data.find(
            anime => anime.title === title
        ) || data.data[0];

        if (!session) {
            console.error('No matching anime found for session');
            throw new Error('No matching anime found');
        }

        console.log(`Session found: ${session.session}`);
        return session.session;
    }

    async _fetchAllEpisodes(session, page = 1, allEpisodes = []) {
        console.log(`Fetching episodes for session: ${session}, page: ${page}`);
        
        const response = await this._makeRequest(
            `${this.baseUrl}/api?m=release&id=${session}&sort=episode_desc&page=${page}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        console.log(`Parsing episode data for page ${page}`);
        const data = await response.json();

        const episodes = data.data.map(item => ({
            title: `Episode ${item.episode}`,
            episodeId: `${session}/${item.session}`,
            number: item.episode,
            image: item.snapshot
        }));

        console.log(`Fetched ${episodes.length} episodes from page ${page}`);
        allEpisodes.push(...episodes);

        if (page < data.last_page) {
            console.log(`More pages available (${page}/${data.last_page}), fetching next page`);
            return this._fetchAllEpisodes(session, page + 1, allEpisodes);
        }

        console.log(`All pages fetched, total episodes: ${allEpisodes.length}`);
        
        // Fetch anime title
        console.log('Fetching anime title from main page');
        const animeResponse = await this._makeRequest(
            `${this.baseUrl}/a/${data.data[0].anime_id}`
        );
        const html = await animeResponse.text();
        const root = parse(html);
        const titleElement = root.querySelector('.title-wrapper span');
        const animeTitle = titleElement ? titleElement.text.trim() : 'Could not fetch title';

        console.log(`Anime title fetched: ${animeTitle}`);
        
        const result = {
            title: animeTitle,
            session: session,
            totalEpisodes: data.total,
            episodes: allEpisodes.reverse()
        };
        
        console.log('Episode fetching completed successfully');
        return result;
    }

    async getEpisodeSources(episodeUrl) {
        console.log(`Fetching episode sources for: ${episodeUrl}`);
        
        try {
            const response = await this._makeRequest(`${this.baseUrl}/play/${episodeUrl}`, {
                sessionId: episodeUrl.split('/')[0]
            });

            console.log('Parsing episode page HTML');
            const html = await response.text();
            const root = parse(html);
            const buttons = root.querySelectorAll('#resolutionMenu button');
            
            console.log(`Found ${buttons.length} quality buttons`);
            
            const videoLinks = [];
            for (const button of buttons) {
                const quality = button.text.trim();
                const kwikLink = button.getAttribute('data-src');
                const audio = button.getAttribute('data-audio');
                
                console.log(`Processing quality: ${quality}, audio: ${audio}`);
                
                if (kwikLink) {
                    console.log(`Extracting video from kwik link: ${kwikLink}`);
                    const videoResult = await this._extractKwikVideo(kwikLink);
                    if (!videoResult.error) {
                        console.log(`Successfully extracted video for quality: ${quality}`);
                        videoLinks.push({
                            quality: quality,
                            url: videoResult.url,
                            referer: 'https://kwik.cx',
                            isDub: audio === 'eng'
                        });
                    } else {
                        console.log(`Failed to extract video for quality: ${quality}, error: ${videoResult.message}`);
                    }
                } else {
                    console.log(`No kwik link found for quality: ${quality}`);
                }
            }

            console.log(`Successfully extracted ${videoLinks.length} video links`);

            // Sort by quality
            console.log('Sorting video links by quality');
            const qualityOrder = {
                '1080p': 1,
                '720p': 2,
                '480p': 3,
                '360p': 4
            };

            videoLinks.sort((a, b) => {
                const qualityA = qualityOrder[a.quality.replace(/.*?(\d+p).*/, '$1')] || 999;
                const qualityB = qualityOrder[b.quality.replace(/.*?(\d+p).*/, '$1')] || 999;
                return qualityA - qualityB;
            });

            console.log('Organizing stream links by sub/dub');
            // Organize links by sub/dub
            const organizedLinks = this._organizeStreamLinks(videoLinks);

            console.log('Preparing final response structure');
            const result = {
                headers: {
                    Referer: 'https://kwik.cx/'
                },
                streams: {
                    sub: organizedLinks.sub.map((link, index) => ({
                        id: index * 2,
                        provider: this._getProviderFromQuality(link.quality),
                        quality: link.quality.replace(/.*?(\d+p).*/, '$1'),
                        url: link.url,
                        referer: link.referer
                    })),
                    dub: organizedLinks.dub.map((link, index) => ({
                        id: index * 2 + 1,
                        provider: this._getProviderFromQuality(link.quality),
                        quality: link.quality.replace(/.*?(\d+p).*/, '$1'),
                        language: 'eng',
                        url: link.url,
                        referer: link.referer
                    }))
                }
            };
            
            console.log('Episode sources fetched successfully');
            return result;
        } catch (error) {
            console.error('Error getting episode sources:', error);
            return { 
                headers: { Referer: 'https://kwik.cx/' },
                streams: { sub: [], dub: [] } 
            };
        }
    }

    _organizeStreamLinks(links) {
        console.log(`Organizing ${links.length} stream links by sub/dub`);
        
        const result = { sub: [], dub: [] };
        const qualityOrder = ['1080p', '720p', '360p'];

        for (const link of links) {
            const isDub = link.isDub;
            const targetList = isDub ? result.dub : result.sub;
            targetList.push(link);
        }

        console.log(`Organized into ${result.sub.length} sub links and ${result.dub.length} dub links`);

        // Sort by quality
        console.log('Sorting links by quality');
        const sortByQuality = (a, b) => {
            const qualityA = qualityOrder.indexOf(a.quality.replace(/.*?(\d+p).*/, '$1'));
            const qualityB = qualityOrder.indexOf(b.quality.replace(/.*?(\d+p).*/, '$1'));
            return qualityB - qualityA;
        };

        result.sub.sort(sortByQuality);
        result.dub.sort(sortByQuality);

        console.log('Stream links organized successfully');
        return result;
    }

    _getProviderFromQuality(quality) {
        console.log(`Extracting provider from quality string: ${quality}`);
        
        // Extract provider from quality string (e.g., "SubsPlease · 1080p" -> "SubsPlease")
        const match = quality.match(/^(.*?)\s*·/);
        const provider = match ? match[1].trim() : 'Unknown';
        
        console.log(`Provider extracted: ${provider}`);
        return provider;
    }

    async _extractKwikVideo(url) {
        console.log(`Extracting Kwik video from URL: ${url}`);
        
        try {
            console.log('Making request to Kwik video page');
            const response = await this._makeRequest(url, {
                headers: {
                    'Referer': this.baseUrl,
                    'Host': 'kwik.cx',
                    'Origin': 'https://kwik.cx',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            console.log('Parsing Kwik video page HTML');
            const html = await response.text();
            const scriptMatch = /(eval)(\(f.*?)(\n<\/script>)/s.exec(html);
            
            if (!scriptMatch) {
                console.log('Could not find obfuscated script in Kwik page');
                return {
                    error: true,
                    message: 'Could not find obfuscated script',
                    originalUrl: url
                };
            }

            console.log('Found obfuscated script, attempting to deobfuscate');
            const evalCode = scriptMatch[2].replace('eval', '');
            const deobfuscated = eval(evalCode);
            const m3u8Match = deobfuscated.match(/https.*?m3u8/);
            
            if (m3u8Match && m3u8Match[0]) {
                console.log(`Successfully extracted m3u8 URL: ${m3u8Match[0]}`);
                return {
                    error: false,
                    url: m3u8Match[0],
                    isM3U8: true,
                    originalUrl: url
                };
            }

            console.log('Could not extract m3u8 URL from deobfuscated script');
            return {
                error: true,
                message: 'Could not extract m3u8 URL',
                originalUrl: url
            };
        } catch (error) {
            console.error('Error extracting Kwik video:', error);
            return {
                error: true,
                message: error.message,
                originalUrl: url
            };
        }
    }
}

console.log('AnimePaheClient class definition completed');

export default AnimePaheClient; 