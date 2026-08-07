import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { news } from '../data/news';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { 
  ArrowLeft, 
  Share2, 
  Calendar, 
  ExternalLink,
  Link2,
  Newspaper
} from 'lucide-react';

const NewsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const newsItem = news.find(n => n.id === parseInt(id));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!newsItem) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col justify-center items-center">
        <h2 className="text-2xl font-bold mb-4">News Item Not Found</h2>
        <Link to="/" className="luxury-button py-2 px-5 text-sm">Return Home</Link>
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const relatedNews = news.filter(n => n.id !== newsItem.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 pb-20">
      <Navbar />

      <div className="pt-28 px-6 max-w-5xl mx-auto space-y-8">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Market News</span>
        </button>

        {/* News Card Content */}
        <GlassCard hover={false} className="p-8 md:p-10 space-y-6 border-white/5 relative overflow-hidden shadow-luxury">
          {/* Subtle logo background */}
          <div className="absolute right-0 top-0 opacity-5 -translate-y-8 translate-x-8 text-gray-500">
            <Newspaper size={300} />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/5 pb-4">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-lg font-bold">
                {newsItem.source}
              </span>
              <span className="flex items-center">
                <Calendar size={14} className="mr-1" />
                {newsItem.date}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleShare}
                className="p-2 border border-white/10 hover:border-accent hover:text-accent bg-white/5 rounded-lg transition-colors cursor-pointer"
                title="Copy Share Link"
              >
                <Share2 size={14} />
              </button>
              {copied && <span className="text-[10px] text-accent font-bold">Copied!</span>}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
              {newsItem.headline}
            </h1>
            
            <p className="text-gray-400 text-sm leading-relaxed italic">
              "{newsItem.summary}"
            </p>
          </div>

          <div className="text-gray-300 text-base leading-relaxed space-y-4 pt-4 border-t border-white/5 font-light">
            <p>{newsItem.content}</p>
            <p>
              Precious metal and crude markets remain highly sensitive to international macro trades. Central banks buying reserve positions and geopolitical variables in key shipment channels will continue shaping local prices for the rest of the quarter.
            </p>
          </div>

          {/* Call to External Action */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-white/5 gap-4">
            <div>
              <p className="text-xs text-gray-500">This article was sourced from the official publisher portal.</p>
            </div>
            
            <a 
              href={newsItem.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="luxury-button flex items-center space-x-1.5 py-2 px-4 text-xs font-semibold"
            >
              <ExternalLink size={14} />
              <span>Read Original Article</span>
            </a>
          </div>
        </GlassCard>

        {/* Related News portal columns */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="text-xl font-bold text-white tracking-tight">Trending Commodity Updates</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedNews.map((rel) => (
              <Link key={rel.id} to={`/news/${rel.id}`} className="block group">
                <GlassCard className="p-5 flex flex-col justify-between h-40 hover:border-accent/30 group">
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                      <span className="font-bold text-gray-400 uppercase">{rel.source}</span>
                      <span>{rel.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors mt-2.5 line-clamp-2">
                      {rel.headline}
                    </h4>
                  </div>
                  <span className="text-[10px] text-accent font-semibold group-hover:underline flex items-center">
                    Read Report <Link2 size={10} className="ml-1" />
                  </span>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default NewsPage;
