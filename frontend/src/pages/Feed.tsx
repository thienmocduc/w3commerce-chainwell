import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@hooks/useI18n';

interface VideoCard {
  id: string;
  kocName: string;
  kocAvatar: string;
  title: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  emoji: string;
  bgGradient: string;
  duration: string;
  isVerified?: boolean;
}

const videos: VideoCard[] = [
  {
    id: 'vid-1',
    kocName: '@linh.koc',
    kocAvatar: 'LK',
    title: 'Review Serum Vitamin C - 30 ngay thay doi da',
    views: '125K',
    likes: '8.2K',
    comments: '432',
    shares: '1.2K',
    emoji: '\uD83E\uDDF4',
    bgGradient: 'linear-gradient(180deg, rgba(251,191,36,.15) 0%, rgba(251,113,133,.1) 100%)',
    duration: '2:35',
    isVerified: true,
  },
  {
    id: 'vid-2',
    kocName: '@minh.kol',
    kocAvatar: 'MK',
    title: 'Collagen Marine - Uong dung cach, dep dung kieu',
    views: '89K',
    likes: '5.6K',
    comments: '287',
    shares: '856',
    emoji: '\uD83D\uDCA7',
    bgGradient: 'linear-gradient(180deg, rgba(6,182,212,.12) 0%, rgba(99,102,241,.1) 100%)',
    duration: '3:12',
    isVerified: true,
  },
  {
    id: 'vid-3',
    kocName: '@thu.koc',
    kocAvatar: 'TK',
    title: 'Matcha Uji - Pha sao cho dung vi?',
    views: '67K',
    likes: '4.1K',
    comments: '198',
    shares: '623',
    emoji: '\uD83C\uDF75',
    bgGradient: 'linear-gradient(180deg, rgba(34,197,94,.12) 0%, rgba(6,182,212,.08) 100%)',
    duration: '1:48',
  },
  {
    id: 'vid-4',
    kocName: '@an.koc',
    kocAvatar: 'AK',
    title: 'Vitamin D3 K2 - Tai sao can uong moi ngay?',
    views: '52K',
    likes: '3.3K',
    comments: '156',
    shares: '445',
    emoji: '\uD83D\uDCA0',
    bgGradient: 'linear-gradient(180deg, rgba(168,85,247,.1) 0%, rgba(251,191,36,.06) 100%)',
    duration: '4:05',
    isVerified: true,
  },
  {
    id: 'vid-5',
    kocName: '@hana.beauty',
    kocAvatar: 'HB',
    title: 'Skincare routine buoi sang - 5 buoc don gian',
    views: '43K',
    likes: '2.8K',
    comments: '134',
    shares: '378',
    emoji: '\u2728',
    bgGradient: 'linear-gradient(180deg, rgba(251,113,133,.1) 0%, rgba(168,85,247,.08) 100%)',
    duration: '2:20',
  },
  {
    id: 'vid-6',
    kocName: '@long.tech',
    kocAvatar: 'LT',
    title: 'Unbox tai nghe TWS - Gia re chat luong cao',
    views: '38K',
    likes: '2.1K',
    comments: '98',
    shares: '267',
    emoji: '\uD83C\uDFA7',
    bgGradient: 'linear-gradient(180deg, rgba(99,102,241,.1) 0%, rgba(6,182,212,.08) 100%)',
    duration: '5:42',
  },
  {
    id: 'vid-7',
    kocName: '@mai.food',
    kocAvatar: 'MF',
    title: 'Lam banh matcha - Cong thuc doc quyen',
    views: '31K',
    likes: '1.9K',
    comments: '87',
    shares: '198',
    emoji: '\uD83C\uDF73',
    bgGradient: 'linear-gradient(180deg, rgba(34,197,94,.1) 0%, rgba(251,191,36,.08) 100%)',
    duration: '3:55',
  },
  {
    id: 'vid-8',
    kocName: '@duc.sport',
    kocAvatar: 'DS',
    title: 'Top 5 Supplement cho nguoi tap gym',
    views: '28K',
    likes: '1.6K',
    comments: '76',
    shares: '156',
    emoji: '\uD83D\uDCAA',
    bgGradient: 'linear-gradient(180deg, rgba(6,182,212,.1) 0%, rgba(34,197,94,.08) 100%)',
    duration: '6:18',
  },
];

const Feed: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => {
    setLikedVideos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="section" style={{ paddingTop: 'calc(var(--topbar-height) + 20px)' }}>
      <div className="container">
        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="section-badge">
            <span className="dot-pulse dot-indigo"></span>
            {t('feed.badge')}
          </div>
          <h2 className="display-lg gradient-text" style={{ marginBottom: 8, whiteSpace: 'nowrap' }}>
            {t('feed.title')}
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '.95rem', marginTop: '8px' }}>
            {t('feed.subtitle')}
          </p>
        </div>

        {/* Video Grid - TikTok style cards */}
        <div className="grid-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="card card-hover"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => navigate(`/feed/${video.id}`)}
            >
              {/* Video Thumbnail */}
              <div style={{
                height: '280px', background: video.bgGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <span style={{ fontSize: '4rem' }}>{video.emoji}</span>

                {/* Play button overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,.05)',
                  transition: 'background 250ms',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', opacity: 0.8,
                    transition: 'opacity 250ms, transform 250ms',
                  }}>
                    {'\u25B6\uFE0F'}
                  </div>
                </div>

                {/* Duration badge */}
                <div style={{
                  position: 'absolute', bottom: '8px', right: '8px',
                  background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
                  borderRadius: '4px', padding: '2px 6px',
                  fontSize: '.6rem', fontWeight: 600, color: '#fff',
                  fontFamily: 'var(--ff-mono)',
                }}>
                  {video.duration}
                </div>

                {/* KOC overlay at bottom */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,.6))',
                  padding: '24px 10px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="koc-avatar" style={{
                      width: '24px', height: '24px', fontSize: '.55rem',
                      border: video.isVerified ? '2px solid var(--c4-500)' : '2px solid var(--c6-500)',
                    }}>
                      {video.kocAvatar}
                    </div>
                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: '#fff' }}>
                      {video.kocName}
                    </span>
                    {video.isVerified && (
                      <span style={{ fontSize: '.6rem' }}>{'\u2705'}</span>
                    )}
                  </div>
                </div>

                {/* Views overlay */}
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                }}>
                  <span className="badge" style={{
                    background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)',
                    color: '#fff', fontSize: '.58rem',
                  }}>
                    {'\u25B6'} {video.views}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '12px' }}>
                <div style={{
                  fontWeight: 600, fontSize: '.75rem', color: 'var(--text-1)',
                  lineHeight: 1.4, marginBottom: '10px',
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {video.title}
                </div>

                {/* Engagement Stats */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '.65rem', color: likedVideos[video.id] ? '#f87171' : 'var(--text-3)',
                      fontFamily: 'var(--ff-body)', padding: '4px',
                      transition: 'color 150ms',
                    }}
                    onClick={(e) => { e.stopPropagation(); toggleLike(video.id); }}
                  >
                    {likedVideos[video.id] ? '\u2764\uFE0F' : '\uD83E\uDD0D'} {video.likes}
                  </button>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '.65rem', color: 'var(--text-3)',
                  }}>
                    {'\uD83D\uDCAC'} {video.comments}
                  </span>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '.65rem', color: 'var(--text-3)',
                  }}>
                    {'\uD83D\uDD01'} {video.shares}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Feed;
