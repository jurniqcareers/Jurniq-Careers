
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { explainTopic } from '../services/geminiService';
import { User } from '../types';

interface NotesProps {
  user: User | null;
  onRequireAuth: () => void;
}

interface DropdownItem {
  id: string;
  name: string;
}

interface Note {
  url: string;
  title: string;
}

const Notes: React.FC<NotesProps> = ({ user, onRequireAuth }) => {
  // Dropdown States
  const [classes, setClasses] = useState<DropdownItem[]>([]);
  const [streams, setStreams] = useState<DropdownItem[]>([]);
  const [subjects, setSubjects] = useState<DropdownItem[]>([]);
  const [chapters, setChapters] = useState<DropdownItem[]>([]);
  const [topics, setTopics] = useState<DropdownItem[]>([]);

  // Selection States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // UI States
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingDrops, setLoadingDrops] = useState<string | null>(null); // 'class', 'stream', etc.
  const [showStreamSelect, setShowStreamSelect] = useState(false);
  
  // PDF Viewer
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');

  // AI Assistant
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const streamRequiredClasses = ['Class 11th', 'Class 12th', 'Undergraduate', 'Postgraduate'];

  // --- Initial Load ---
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingDrops('class');
      try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        const classList = querySnapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
        
        // Custom Sort
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
        setLoadingDrops(null);
      }
    };
    fetchClasses();
  }, []);

  // --- Handlers ---

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const className = classes.find(c => c.id === classId)?.name || '';
    
    setSelectedClass(classId);
    setSelectedStream('');
    setSelectedSubject('');
    setSelectedChapter('');
    setSelectedTopic('');
    setNotes([]);
    setStreams([]);
    setSubjects([]);
    setChapters([]);
    setTopics([]);

    if (!classId) return;

    if (streamRequiredClasses.some(c => c.toLowerCase() === className.toLowerCase())) {
        setShowStreamSelect(true);
        setLoadingDrops('stream');
        try {
            const snap = await getDocs(collection(db, `classes/${classId}/streams`));
            setStreams(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) { console.error(e); }
        setLoadingDrops(null);
    } else {
        setShowStreamSelect(false);
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
      setLoadingDrops('subject');
      try {
          const path = streamId 
            ? `classes/${classId}/streams/${streamId}/subjects` 
            : `classes/${classId}/subjects`;
          const snap = await getDocs(collection(db, path));
          setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      setLoadingDrops(null);
  };

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const subjectId = e.target.value;
      setSelectedSubject(subjectId);
      setSelectedChapter('');
      setSelectedTopic('');
      setChapters([]);
      setTopics([]);
      
      if(!subjectId) return;

      setLoadingDrops('chapter');
      try {
          const path = selectedStream 
            ? `classes/${selectedClass}/streams/${selectedStream}/subjects/${subjectId}/chapters`
            : `classes/${selectedClass}/subjects/${subjectId}/chapters`;
          const snap = await getDocs(collection(db, path));
          setChapters(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      setLoadingDrops(null);
  };

  const handleChapterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const chapterId = e.target.value;
      setSelectedChapter(chapterId);
      setSelectedTopic('');
      setTopics([]);

      if(!chapterId) return;

      setLoadingDrops('topic');
      try {
          const path = selectedStream
            ? `classes/${selectedClass}/streams/${selectedStream}/subjects/${selectedSubject}/chapters/${chapterId}/topics`
            : `classes/${selectedClass}/subjects/${selectedSubject}/chapters/${chapterId}/topics`;
          const snap = await getDocs(collection(db, path));
          setTopics(snap.docs.map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      setLoadingDrops(null);
  };

  const handleSearch = async () => {
      if (!selectedTopic) return;
      if (!user) { onRequireAuth(); return; }

      setLoadingNotes(true);
      setNotes([]);
      try {
          const path = selectedStream
            ? `classes/${selectedClass}/streams/${selectedStream}/subjects/${selectedSubject}/chapters/${selectedChapter}/topics/${selectedTopic}`
            : `classes/${selectedClass}/subjects/${selectedSubject}/chapters/${selectedChapter}/topics/${selectedTopic}`;
          
          const docSnap = await getDoc(doc(db, path));
          if (docSnap.exists()) {
              const data = docSnap.data();
              const topicName = data.name || "Note";
              // Filter keys starting with 'notes_url'
              const urls = Object.keys(data)
                .filter(k => k.startsWith('notes_url'))
                .map(k => data[k])
                .filter(Boolean);
              
              setNotes(urls.map((url, i) => ({ url, title: `${topicName} - Note ${i + 1}` })));
          }
      } catch (e) { console.error(e); }
      setLoadingNotes(false);
  };

  const handleAskAI = async () => {
      if (!aiQuery.trim()) return;
      setAiLoading(true);
      setAiResponse(null);
      setAiError(null);
      
      const res = await explainTopic(aiQuery);
      if (res) {
          setAiResponse(res);
      } else {
          setAiError("Sorry, I couldn't explain that topic right now. Please try again.");
      }
      setAiLoading(false);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        
        {/* Search Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 mb-8 animate-fade-in-up">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-3 text-gray-800">
                <i className="fas fa-search text-gray-500"></i> Find Study Notes by Topic
            </h2>
            <p className="text-gray-500 mb-6 text-sm">Select a class, subject, chapter, and topic to find relevant study notes.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                {/* Class */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Class Level</label>
                    <select disabled={loadingDrops === 'class'} value={selectedClass} onChange={handleClassChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition">
                        <option value="">{loadingDrops === 'class' ? 'Loading...' : 'Select Class'}</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Stream (Conditional) */}
                {showStreamSelect && (
                    <div className="animate-fade-in-up">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Stream</label>
                        <select disabled={loadingDrops === 'stream'} value={selectedStream} onChange={handleStreamChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition">
                            <option value="">{loadingDrops === 'stream' ? 'Loading...' : 'Select Stream'}</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
                    <select disabled={!subjects.length || loadingDrops === 'subject'} value={selectedSubject} onChange={handleSubjectChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition">
                        <option value="">{loadingDrops === 'subject' ? 'Loading...' : 'Select Subject'}</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {/* Chapter */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Chapter</label>
                    <select disabled={!chapters.length || loadingDrops === 'chapter'} value={selectedChapter} onChange={handleChapterChange} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition">
                        <option value="">{loadingDrops === 'chapter' ? 'Loading...' : 'Select Chapter'}</option>
                        {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Topic */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Topic</label>
                    <select disabled={!topics.length || loadingDrops === 'topic'} value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none transition">
                        <option value="">{loadingDrops === 'topic' ? 'Loading...' : 'Select Topic'}</option>
                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                {/* Search Button */}
                <button 
                    onClick={handleSearch} 
                    disabled={!selectedTopic || loadingNotes}
                    className={`w-full font-semibold py-3 px-6 rounded-lg text-white transition-all shadow-md flex items-center justify-center ${!selectedTopic || loadingNotes ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-blue hover:bg-primary-dark'}`}
                >
                    {loadingNotes ? <div className="loader !w-5 !h-5 !border-2"></div> : 'Search Notes'}
                </button>
            </div>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 mb-8 animate-fade-in-up">
             <h2 className="text-xl font-semibold mb-2 flex items-center gap-3 text-gray-800">
                <i className="fas fa-robot text-purple-500"></i> Personalised AI 'JurniQ AI' Study Assistant
            </h2>
            <p className="text-gray-500 mb-6 text-sm">Ask a question about any topic and get an instant explanation.</p>
            <div className="flex flex-col md:flex-row items-center gap-4">
                <input 
                    type="text" 
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                    placeholder="e.g., Explain the states of matter" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition"
                />
                <button 
                    onClick={handleAskAI}
                    disabled={!aiQuery.trim() || aiLoading}
                    className="bg-primary-blue text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-dark transition-all shadow-sm whitespace-nowrap w-full md:w-auto disabled:bg-gray-300"
                >
                    {aiLoading ? 'Thinking...' : "Ask Personalised AI 'JurniQ AI'"}
                </button>
            </div>
            {(aiResponse || aiLoading || aiError) && (
                <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200 min-h-[80px]">
                    {aiLoading ? (
                        <div className="flex items-center justify-center h-full"><div className="loader !border-gray-300 !border-t-purple-500"></div><p className="ml-3 text-gray-500">Generating Summary...</p></div>
                    ) : aiError ? (
                        <div className="flex items-center justify-center h-full text-red-500">
                            <i className="fas fa-exclamation-circle mr-2"></i> {aiError}
                        </div>
                    ) : (
                        <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: aiResponse || '' }}></div>
                    )}
                </div>
            )}
        </div>

        {/* Results Display */}
        <div className="min-h-[100px]">
             {notes.length > 0 ? (
                 <>
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Study Notes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {notes.map((note, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => { setPdfUrl(note.url); setPdfTitle(note.title); }}
                                className="group cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 p-4"
                            >
                                <div className="w-full h-40 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
                                    <i className="fas fa-file-pdf text-4xl text-primary-blue"></i>
                                </div>
                                <p className="font-semibold text-gray-700 text-center text-sm line-clamp-2">{note.title}</p>
                            </div>
                        ))}
                    </div>
                 </>
             ) : (
                 !loadingNotes && <p className="text-center text-gray-400 py-10">Select a topic and click "Search Notes" to view results.</p>
             )}
        </div>

        {/* PDF Modal */}
        {pdfUrl && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">{pdfTitle}</h3>
                        <button onClick={() => setPdfUrl(null)} className="text-gray-500 hover:text-red-500 transition">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div className="flex-grow bg-gray-200 relative">
                        <iframe 
                            src={`${pdfUrl}#toolbar=0`} 
                            className="w-full h-full border-0" 
                            title="PDF Viewer"
                        ></iframe>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Notes;
