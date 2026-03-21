'use server';

export interface ChannelVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration?: string;
}

const BASE = 'https://www.googleapis.com/youtube/v3';

async function getUploadsPlaylistId(apiKey: string, channelId: string): Promise<string | null> {
  const res = await fetch(
    `${BASE}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
    { next: { revalidate: 86400 } }
  );
  const data = await res.json();
  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

export async function fetchChannelVideos(
  pageToken?: string
): Promise<{ videos: ChannelVideo[]; nextPageToken?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return { videos: [] };

  const playlistId = await getUploadsPlaylistId(apiKey, channelId);
  if (!playlistId) return { videos: [] };

  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: '24',
    key: apiKey,
    ...(pageToken ? { pageToken } : {}),
  });

  const res = await fetch(`${BASE}/playlistItems?${params}`, {
    next: { revalidate: 300 },
  });
  const data = await res.json();

  const videos: ChannelVideo[] = (data?.items ?? [])
    .filter((item: { snippet?: { resourceId?: { videoId?: string } } }) => item.snippet?.resourceId?.videoId)
    .map(
      (item: {
        snippet: {
          resourceId: { videoId: string };
          title: string;
          description: string;
          publishedAt: string;
          thumbnails?: { medium?: { url: string }; default?: { url: string } };
        };
      }) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
        publishedAt: item.snippet.publishedAt,
      })
    );

  return {
    videos,
    nextPageToken: data?.nextPageToken,
  };
}

export async function searchChannelVideos(query: string): Promise<ChannelVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    q: query,
    type: 'video',
    maxResults: '24',
    key: apiKey,
  });

  const res = await fetch(`${BASE}/search?${params}`, {
    next: { revalidate: 60 },
  });
  const data = await res.json();

  return (data?.items ?? []).map(
    (item: {
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails?: { medium?: { url: string } };
      };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ??
        `https://i.ytimg.com/vi/${item.id.videoId}/mqdefault.jpg`,
      publishedAt: item.snippet.publishedAt,
    })
  );
}
