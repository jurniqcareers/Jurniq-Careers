
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebaseService';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { User } from '../types';

interface VideosProps {
  user: User | null;
  onRequireAuth: () => void;
  onBack: () => void;
}

interface DropdownItem {
  id: string;
  name: string;
}

interface YouTubeVideo {
  title: string;
  url: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  views: string;
  likes: string;
}

declare global {
    interface Window {
        Plyr: any;
    }
}

const Videos: React.FC<VideosProps> = ({ user, onRequireAuth, onBack }) => {
  // Dropdown Data
  const [classes, setClasses] = useState<DropdownItem[]>([]);
  const [streams, setStreams] = useState<DropdownItem[]>([]);
  const [subjects, setSubjects] = useState<DropdownItem[]>([]);
  const [chapters, setChapters] = useState<DropdownItem[]>([]);
  const [topics, setTopics] = useState<DropdownItem[]>([]);

  // Selection State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // UI State
  const [showStreamSelect, setShowStreamSelect] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // 'class', 'stream', etc.
  const [searchLoading, setSearchLoading] = useState(false);
  const [videoResults, setVideoResults] = useState<YouTubeVideo[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  
  // Player Ref
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const streamRequiredClasses = ['Class 11th', 'Class 12th', 'Undergraduate', 'Postgraduate'];

  // --- Initial Load ---
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading('class');
      try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        const classList = querySnapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
        
        // Custom Sort logic from HTML
        const sorted = classList.sort((a, b) => {
            const getClassOrder = (name: string) => {
                if (name.startsWith('Class ')) return parseInt(name.replace('Class ', ''), 10);
                if (name === 'Undergraduate') return 100;
                if (name === 'Postgraduate') return 101;
                return 999;
            };
            return getClassOrder(a.name) - getClassOrder(b.name);
        });
        
        setClasses(sorted);
      } catch (error) {
        console.error("Error loading classes", error);
      } finally {
        setLoading(null);
      }
    };
    fetchClasses();
  }, []);

  // --- Handlers ---

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const className = classes.find(c => c.id === classId)?.name || '';
    
    // Reset states
    setSelectedClass(classId);
    setSelectedStream('');
    setSelectedSubject('');
    setSelectedChapter('');
    setSelectedTopic('');
    setStreams([]);
    setSubjects([]);
    setChapters([]);
    setTopics([]);
    setVideoResults([]);
    setHasSearched(false);

    if (!classId) return;

    // Normalize logic to match HTML behavior roughly
    const requiresStream = streamRequiredClasses.some(req => className.toLowerCase().includes(req.toLowerCase()));

    if (requiresStream) {
        setShowStreamSelect(true);
        setLoading('stream');
        try {
            const snap = await getDocs(collection(db, `classes/${classId}/streams`));
            setStreams(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) { console.error(e); }
        setLoading(null);
    } else {
        setShowStreamSelect(false);
        // Fetch subjects directly
        fetchSubjects(classId, null);
    }
  };

  const handleStreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const streamId = e.target.value;
      setSelectedStream(streamId);
      setSelectedSubject('');
      setSelectedChapter('');
      setSelectedTopic('');
      setSubjects([]);
      setChapters([]);
      setTopics([]);
      if (streamId) fetchSubjects(selectedClass, streamId);
  };

  const fetchSubjects = async (classId: string, streamId: string | null) => {
      setLoading('subject');
      try {
          const path = streamId 
            ? `classes/${classId}/streams/${streamId}/subjects` 
            : `classes/${classId}/subjects`;
          const snap = await getDocs(collection(db, path));
          setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      setLoading(null);
  };

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const subjectId = e.target.value;
      setSelectedSubject(subjectId);
      setSelectedChapter('');
      setSelectedTopic('');
      setChapters([]);
      setTopics([]);
      
      if(!subjectId) return;

      setLoading('chapter');
      try {
          const path = selectedStream 
            ? `classes/${selectedClass}/streams/${selectedStream}/subjects/${subjectId}/chapters`
            : `classes/${selectedClass}/subjects/${subjectId}/chapters`;
          const snap = await getDocs(collection(db, path));
          setChapters(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      setLoading(null);
  };

  const handleChapterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const chapterId = e.target.value;
      setSelectedChapter(chapterId);
      setSelectedTopic('');
      setTopics([]);

      if(!chapterId) return;

      setLoading('topic');
      try {
          const path = selectedStream
            ? `classes/${selectedClass}/streams/${selectedStream}/subjects/${selectedSubject}/chapters/${chapterId}/topics`
            : `classes/${selectedClass}/subjects/${selectedSubject}/chapters/${chapterId}/topics`;
          const snap = await getDocs(collection(db, path));
          setTopics(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      setLoading(null);
  };

  const handleSearch = async () => {
      if (!selectedTopic) return;
      if (!user) { onRequireAuth(); return; }

      setSearchLoading(true);
      setHasSearched(true);
      setVideoResults([]);

      try {
          const path = selectedStream
            ? `classes/${selectedClass}/streams/${selectedStream}/subjects/${selectedSubject}/chapters/${selectedChapter}/topics/${selectedTopic}`
            : `classes/${selectedClass}/subjects/${selectedSubject}/chapters/${selectedChapter}/topics/${selectedTopic}`;
          
          const docSnap = await getDoc(doc(db, path));
          if (docSnap.exists()) {
              const data = docSnap.data();
              const topicName = data.name || "Video";
              
              // Filter keys starting with 'video_url'
              const urls = Object.keys(data)
                .filter(k => k.startsWith('video_url'))
                .map(k => data[k])
                .filter(Boolean);
              
              setVideoResults(urls.map((url, i) => ({
                  title: `${topicName} - Video ${i + 1}`,
                  url: url,
                  difficulty: 'Medium',
                  views: '',
                  likes: ''
              })));
          }
      } catch (e) { console.error(e); }
      
      setSearchLoading(false);
  };

  // --- Video Player Logic ---

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const directMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (directMatch && directMatch[2].length === 11) return directMatch[2];
    try {
        const urlObj = new URL(url);
        if(urlObj.hostname.includes('youtube') && urlObj.searchParams.has('v')) {
           return urlObj.searchParams.get('v');
        }
    } catch(e) { console.error("Could not parse URL:", url, e); }
    return null;
  };

  const getThumbnail = (videoUrl: string) => {
    const videoId = getYoutubeId(videoUrl);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://placehold.co/480x360?text=Invalid_URL';
  };

  const openModal = (video: YouTubeVideo) => {
      setSelectedVideo(video);
      setModalOpen(true);
  };

  const closeModal = () => {
      setModalOpen(false);
      setSelectedVideo(null);
      if (playerInstanceRef.current) {
          playerInstanceRef.current.destroy();
          playerInstanceRef.current = null;
      }
  };

  useEffect(() => {
      if (modalOpen && selectedVideo && playerContainerRef.current && window.Plyr) {
          const youtubeId = getYoutubeId(selectedVideo.url);
          if (youtubeId) {
              const div = document.createElement('div');
              div.setAttribute('data-plyr-provider', 'youtube');
              div.setAttribute('data-plyr-embed-id', youtubeId);
              playerContainerRef.current.appendChild(div);

              playerInstanceRef.current = new window.Plyr(div, {
                  autoplay: true,
                  controls: [
                      'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
                  ],
                  settings: ['captions', 'quality', 'speed', 'loop'],
                  quality: { 
                      default: 720, 
                      options: [4320, 2160, 1440, 1080, 720, 576, 480, 360, 240] 
                  },
                  youtube: { 
                      noCookie: true, 
                      rel: 0, 
                      showinfo: 0, 
                      iv_load_policy: 3, 
                      modestbranding: 1 
                  }
              });
          }
      }
      return () => {
          if (!modalOpen && playerInstanceRef.current) {
              playerInstanceRef.current.destroy();
              playerInstanceRef.current = null;
          }
      };
  }, [modalOpen, selectedVideo]);

  // No filtering needed
  const filteredVideos = videoResults;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
                 <svg className="w-8 h-8 text-primary-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                  </svg>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Study Videos</h1>
            </div>
            <button onClick={onBack} className="text-gray-500 hover:text-gray-800 font-medium">Back to Dashboard</button>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 mb-8 animate-fade-in-up">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-3 text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                Find Videos by Topic
            </h2>
            <p className="text-gray-500 mb-6 text-sm">Select a class, subject, chapter, and topic to find the relevant videos.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                {/* Class */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Class Level</label>
                    <select disabled={loading === 'class'} value={selectedClass} onChange={handleClassChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">{loading === 'class' ? 'Loading...' : 'Select a level'}</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Stream */}
                {showStreamSelect && (
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Stream</label>
                        <select disabled={loading === 'stream'} value={selectedStream} onChange={handleStreamChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                            <option value="">{loading === 'stream' ? 'Loading...' : 'Select stream'}</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
                    <select disabled={!subjects.length || loading === 'subject'} value={selectedSubject} onChange={handleSubjectChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">{loading === 'subject' ? 'Loading...' : 'Select subject'}</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {/* Chapter */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Chapter</label>
                    <select disabled={!chapters.length || loading === 'chapter'} value={selectedChapter} onChange={handleChapterChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">{loading === 'chapter' ? 'Loading...' : 'Select chapter'}</option>
                        {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Topic */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Topic</label>
                    <select disabled={!topics.length || loading === 'topic'} value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">{loading === 'topic' ? 'Loading...' : 'Select topic'}</option>
                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                {/* Search Button */}
                <button 
                    onClick={handleSearch} 
                    disabled={!selectedTopic || searchLoading}
                    className="w-full bg-primary-blue text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-dark transition-all shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center"
                >
                    {searchLoading ? <div className="loader !w-5 !h-5 !border-2"></div> : 'Find Video'}
                </button>
            </div>
        </div>

        {/* Loading Indicator */}
        {searchLoading && (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center animate-fade-in-up mb-8">
                <div className="loader !w-12 !h-12 !border-4 border-blue-500 mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-800">Loading videos...</h3>
            </div>
        )}

        {/* Results Area */}
        {hasSearched && !searchLoading && (
            <div className="animate-fade-in-up">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Video Results</h2>
                </div>
                
                {filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredVideos.map((video, idx) => (
                            <div 
                                key={idx}
                                onClick={() => openModal(video)}
                                className="video-result-card bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden transition-transform transform hover:-translate-y-1.5 cursor-pointer group"
                            >
                                <div className="relative">
                                    <img 
                                        src={getThumbnail(video.url)} 
                                        alt={video.title} 
                                        className="w-full h-44 object-cover" 
                                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/480x360?text=Video+Not+Found'; }}
                                    />
                                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm hidden">
                                        {video.difficulty}
                                    </div>
                                    <div className="thumbnail-overlay absolute inset-0 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity bg-black/40">
                                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 leading-snug">{video.title}</h3>
                                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500 font-medium hidden">
                                        <span className="flex items-center gap-1"><i className="fas fa-eye text-primary-blue"></i> {video.views}</span>
                                        <span className="flex items-center gap-1"><i className="fas fa-thumbs-up text-green-500"></i> {video.likes}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
                        <p className="text-gray-500">No videos found for this topic.</p>
                    </div>
                )}
            </div>
        )}

        {!hasSearched && !searchLoading && (
            <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-4"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"></path><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"></path><path d="M15 2v5h5"></path></svg>
                <h3 className="text-lg font-semibold text-gray-700">Your learning journey starts here.</h3>
                <p className="mt-1">Select a topic from the dropdowns above to find the video.</p>
            </div>
        )}

      </div>

      {/* Video Modal */}
      {modalOpen && selectedVideo && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in">
              <div className="flex justify-between items-center p-4 flex-shrink-0 z-10">
                  <h3 className="text-lg font-semibold text-gray-100 line-clamp-1 pr-4">{selectedVideo.title}</h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white transition">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </div>
              <div className="flex-grow relative">
                  <div 
                    ref={playerContainerRef} 
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute inset-0 w-full h-full flex items-center justify-center bg-black"
                  >
                      {/* Plyr will inject here */}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Videos;
