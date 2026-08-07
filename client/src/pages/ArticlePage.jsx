import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { articles } from '../data/articles';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { 
  ArrowLeft, 
  Share2, 
  Bookmark, 
  BookmarkCheck, 
  Clock, 
  User, 
  Calendar,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Link2
} from 'lucide-react';

const ArticlePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = articles.find(a => a.id === parseInt(id));

  const [scrollProgress, setScrollProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState('base'); // base, lg, xl
  const [readingMode, setReadingMode] = useState('dark'); // dark, warm, sepia
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Scroll progress listener
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.scrollTo(0, 0);

    // Load bookmark status from localStorage
    const savedBookmarks = JSON.parse(localStorage.getItem('article_bookmarks') || '[]');
    setBookmarked(savedBookmarks.includes(parseInt(id)));

    return () => window.removeEventListener('scroll', handleScroll);
  }, [id]);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col justify-center items-center">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <Link to="/" className="luxury-button py-2 px-5 text-sm">Return Home</Link>
      </div>
    );
  }

  const handleBookmarkToggle = () => {
    const savedBookmarks = JSON.parse(localStorage.getItem('article_bookmarks') || '[]');
    let updated;
    if (bookmarked) {
      updated = savedBookmarks.filter(bId => bId !== parseInt(id));
      setBookmarked(false);
    } else {
      updated = [...savedBookmarks, parseInt(id)];
      setBookmarked(true);
    }
    localStorage.setItem('article_bookmarks', JSON.stringify(updated));
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find related articles (same category or adjacent)
  const relatedArticles = articles.filter(a => a.id !== article.id).slice(0, 3);

  const getFontSizeClass = () => {
    if (fontSize === 'lg') return 'text-lg leading-relaxed';
    if (fontSize === 'xl') return 'text-xl leading-loose';
    return 'text-base leading-relaxed';
  };

  const getReadingModeClass = () => {
    if (readingMode === 'warm') return 'bg-[#181512] text-[#E8DCC4] border-[#2C241E]';
    if (readingMode === 'sepia') return 'bg-[#1E1C18] text-[#D8C7A9] border-[#362E25]';
    return 'bg-gray-900/40 text-gray-300 border-white/5';
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 pb-20">
      
      {/* Sticky Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-accent to-amber-500 z-50 transition-all duration-100"
        style={{ width: `${scrollProgress}%` }}
      />

      <Navbar />

      <div className="pt-28 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Toolbar controls & Table of Contents */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors py-2"
          >
            <ArrowLeft size={16} />
            <span>Back to Portal</span>
          </button>

          {/* Reading Customization Console */}
          <GlassCard hover={false} className="p-4 space-y-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Reading Settings</h4>
            
            {/* Font Adjust */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Text Size</span>
              <div className="flex space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                <button 
                  onClick={() => setFontSize('base')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${fontSize === 'base' ? 'bg-accent text-slate-950' : 'text-gray-400 hover:text-white'}`}
                >
                  <ZoomOut size={12} />
                </button>
                <button 
                  onClick={() => setFontSize('lg')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${fontSize === 'lg' ? 'bg-accent text-slate-950' : 'text-gray-400 hover:text-white'}`}
                >
                  A
                </button>
                <button 
                  onClick={() => setFontSize('xl')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${fontSize === 'xl' ? 'bg-accent text-slate-950' : 'text-gray-400 hover:text-white'}`}
                >
                  <ZoomIn size={12} />
                </button>
              </div>
            </div>

            {/* Reading Mode Background */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Layout</span>
              <div className="flex space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                {['dark', 'warm', 'sepia'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setReadingMode(mode)}
                    className={`px-2 py-1.5 rounded text-[10px] uppercase font-bold transition-all ${
                      readingMode === mode ? 'bg-accent text-slate-950' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Table of contents */}
          {article.toc && article.toc.length > 0 && (
            <GlassCard hover={false} className="p-4 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Table of Contents</h4>
              <nav className="space-y-2.5 text-xs text-gray-400">
                {article.toc.map((section, idx) => (
                  <a
                    key={idx}
                    href={`#section-${idx}`}
                    className="block hover:text-accent hover:translate-x-0.5 transition-all font-medium py-1"
                  >
                    {idx + 1}. {section}
                  </a>
                ))}
              </nav>
            </GlassCard>
          )}

          {/* Social shares and bookmarks */}
          <GlassCard hover={false} className="p-4 flex justify-between items-center">
            <button 
              onClick={handleBookmarkToggle}
              className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-accent font-semibold cursor-pointer"
            >
              {bookmarked ? <BookmarkCheck size={16} className="text-accent" /> : <Bookmark size={16} />}
              <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-accent font-semibold cursor-pointer"
            >
              <Share2 size={16} />
              <span>{copied ? 'Copied Link!' : 'Share Article'}</span>
            </button>
          </GlassCard>
        </div>

        {/* Center: Article Content */}
        <div className="col-span-1 lg:col-span-3 space-y-8">
          
          {/* Article Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-accent">
              <Sparkles size={12} />
              <span>{article.category}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 border-b border-white/5 pb-6">
              <span className="flex items-center">
                <User size={14} className="mr-1 text-accent" />
                {article.author}
              </span>
              <span className="flex items-center">
                <Calendar size={14} className="mr-1" />
                {article.publishDate}
              </span>
              <span className="flex items-center">
                <Clock size={14} className="mr-1 text-accent" />
                {article.readingTime}
              </span>
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-accent hover:underline"
              >
                <Link2 size={14} className="mr-1" />
                Verify Source
              </a>
            </div>
          </div>

          {/* Reading frame container */}
          <GlassCard hover={false} className={`p-8 md:p-10 border ${getReadingModeClass()} shadow-luxury transition-all duration-300`}>
            {/* Inject elements manually with anchors for TOC */}
            <article 
              className={`prose prose-invert max-w-none ${getFontSizeClass()}`}
              dangerouslySetInnerHTML={{
                // Auto add ID tags to headers for the TOC links
                __html: article.content.replace(/<h2>/g, (match, offset) => {
                  const idx = article.content.substring(0, offset).split('<h2>').length - 1;
                  return `<h2 id="section-${idx}" class="text-xl font-bold text-white mt-8 mb-4 border-b border-white/5 pb-2">`;
                }).replace(/<p>/g, '<p class="mb-4 text-gray-300 leading-relaxed font-light">')
              }}
            />
          </GlassCard>

          {/* Author Badge */}
          <GlassCard hover={false} className="p-6 flex items-center space-x-4 border-white/5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-accent to-amber-600 flex items-center justify-center font-bold text-slate-950">
              {article.author.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-white">{article.author}</h4>
              <p className="text-xs text-gray-400 mt-0.5">Commodity Market Analyst & Financial Writer</p>
            </div>
          </GlassCard>

          {/* Related Articles block */}
          <div className="space-y-4 pt-6 border-t border-white/5">
            <h3 className="text-xl font-bold text-white">Recommended Reading</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <Link key={rel.id} to={`/articles/${rel.id}`} className="block group">
                  <GlassCard className="p-5 h-44 flex flex-col justify-between hover:border-accent/30 group">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-extrabold block">
                        {rel.category}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors mt-2 line-clamp-2">
                        {rel.title}
                      </h4>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      <span>{rel.readingTime}</span>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
