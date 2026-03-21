'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { fetchChannelVideos, searchChannelVideos, type ChannelVideo } from '@/app/actions/youtube-channel';
import { extractYoutubeId } from '@/types/youtube-content';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  onSelect: (video: ChannelVideo) => void;
  onClose: () => void;
  excludeIds?: string[];
}

type Tab = 'browse' | 'search' | 'url';

export default function VideoPickerModal({ onSelect, onClose, excludeIds = [] }: Props) {
  const [tab, setTab] = useState<Tab>('browse');

  const [browseVideos, setBrowseVideos] = useState<ChannelVideo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isLoadingBrowse, setIsLoadingBrowse] = useState(false);
  const [browseError, setBrowseError] = useState('');

  const loadBrowse = useCallback(async (pageToken?: string) => {
    setIsLoadingBrowse(true);
    setBrowseError('');
    try {
      const { videos, nextPageToken: next } = await fetchChannelVideos(pageToken);
      setBrowseVideos((prev) => (pageToken ? [...prev, ...videos] : videos));
      setNextPageToken(next);
    } catch {
      setBrowseError('채널 영상을 불러오지 못했습니다.');
    } finally {
      setIsLoadingBrowse(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'browse' && browseVideos.length === 0) {
      void loadBrowse();
    }
  }, [tab, browseVideos.length, loadBrowse]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChannelVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchChannelVideos(searchQuery.trim());
    setSearchResults(results);
    setIsSearching(false);
  }

  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  function handleUrlSubmit() {
    const id = extractYoutubeId(urlInput.trim());
    if (!id) {
      setUrlError('유효한 유튜브 URL 또는 영상 ID가 아닙니다.');
      return;
    }
    onSelect({
      videoId: id,
      title: urlInput.trim(),
      description: '',
      thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      publishedAt: new Date().toISOString(),
    });
    setUrlInput('');
    setUrlError('');
  }

  function VideoGrid({
    videos,
    loading,
    error,
  }: {
    videos: ChannelVideo[];
    loading: boolean;
    error?: string;
  }) {
    if (loading && videos.length === 0) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">불러오는 중...</div>
      );
    }
    if (error) {
      return <div className="flex h-48 items-center justify-center text-sm text-red-500">{error}</div>;
    }
    if (videos.length === 0) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">영상이 없습니다.</div>
      );
    }

    return (
      <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1">
        {videos.map((video) => {
          const excluded = excludeIds.includes(video.videoId);
          return (
            <button
              key={video.videoId}
              type="button"
              disabled={excluded}
              onClick={() => !excluded && onSelect(video)}
              className={`group relative overflow-hidden rounded-lg border text-left transition ${
                excluded
                  ? 'cursor-not-allowed border-gray-200 opacity-40'
                  : 'cursor-pointer border-gray-200 hover:border-gray-800 hover:shadow-md'
              }`}
            >
              <div className="relative aspect-video bg-gray-100">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="200px"
                  unoptimized={video.thumbnail.includes('ytimg.com')}
                />
                {excluded ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                    추가됨
                  </span>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-900 opacity-0 transition group-hover:opacity-100">
                      선택
                    </span>
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{video.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold">영상 선택</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-gray-400 hover:text-gray-700"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-5 pb-2 pt-4">
          {(
            [
              { key: 'browse' as const, label: '내 채널 영상' },
              { key: 'search' as const, label: '채널 내 검색' },
              { key: 'url' as const, label: 'URL 입력' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden px-5 pb-4">
          {tab === 'browse' ? (
            <div className="flex h-full flex-col gap-3">
              <VideoGrid videos={browseVideos} loading={isLoadingBrowse} error={browseError} />
              {nextPageToken ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadBrowse(nextPageToken)}
                  disabled={isLoadingBrowse}
                  className="w-full"
                >
                  {isLoadingBrowse ? '불러오는 중...' : '더 보기'}
                </Button>
              ) : null}
            </div>
          ) : null}

          {tab === 'search' ? (
            <div className="flex h-full flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="영상 제목으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void handleSearch())}
                />
                <Button type="button" onClick={() => void handleSearch()} disabled={isSearching}>
                  {isSearching ? '검색 중...' : '검색'}
                </Button>
              </div>
              <VideoGrid videos={searchResults} loading={isSearching} />
            </div>
          ) : null}

          {tab === 'url' ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm text-gray-500">외부 유튜브 URL이나 다른 채널 영상도 추가할 수 있습니다.</p>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
                />
                <Button type="button" onClick={handleUrlSubmit}>
                  추가
                </Button>
              </div>
              {urlError ? <p className="text-sm text-red-500">{urlError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
