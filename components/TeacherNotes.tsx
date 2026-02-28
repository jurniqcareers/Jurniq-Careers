
import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebaseService';
import { collection, getDocs, addDoc, serverTimestamp, query, where, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User } from '../types';

interface TeacherNotesProps {
  user: User | null;
  onRequireAuth: () => void;
  onBack: () => void;
}

const ADMIN_EMAILS = ['chairman@balitandsons.com', 'jurniqcareers@gmail.com'];

const TeacherNotes: React.FC<TeacherNotesProps> = ({ user, onRequireAuth, onBack }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'review'>('upload');
  
  // Dropdown Data
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  // Selection
  const [selections, setSelections] = useState({
      classId: '', className: '',
      streamId: '', streamName: '',
      subjectId: '', subjectName: '',
      chapterId: '', chapterName: '',
      topicId: '', topicName: ''
  });

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // Teacher's My Uploads
  const [myUploads, setMyUploads] = useState<any[]>([]);

  // Admin Review State
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
      if (user) {
          if (ADMIN_EMAILS.includes(user.email || '')) {
              setIsAdmin(true);
          }
          fetchMyUploads();
      }
      fetchClasses();
  }, [user]);

  // --- Data Fetching ---
  const fetchClasses = async () => {
      const snap = await getDocs(collection(db, "classes"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort logic
      const sorted = list.sort((a: any, b: any) => {
        const getOrder = (n: string) => {
            if (n.startsWith('Class ')) return parseInt(n.replace('Class ', ''), 10);
            if (n === 'Undergraduate') return 100;
            if (n === 'Postgraduate') return 101;
            return 999;
        };
        return getOrder(a.name) - getOrder(b.name);
      });
      setClasses(sorted);
  };

  const fetchMyUploads = async () => {
      if (!user) return;
      try {
          // Fetch user's uploads
          const q = query(collection(db, "reviews"), where("teacherId", "==", user.uid));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Client-side sort by uploadedAt descending
          list.sort((a: any, b: any) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
          setMyUploads(list);
      } catch (e) {
          console.error("Error fetching my uploads", e);
      }
  };

  const [showStreamSelect, setShowStreamSelect] = useState(false);
  const streamRequiredClasses = ['Class 11th', 'Class 12th', 'Undergraduate', 'Postgraduate'];

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      const name = classes.find(c => c.id === id)?.name || '';
      setSelections({ ...selections, classId: id, className: name, streamId: '', subjectId: '', chapterId: '', topicId: '' });
      setStreams([]); setSubjects([]); setChapters([]); setTopics([]);

      if (!id) return;

      const requiresStream = streamRequiredClasses.some(req => name.toLowerCase().includes(req.toLowerCase()));
      
      if (requiresStream) {
          setShowStreamSelect(true);
          const snap = await getDocs(collection(db, `classes/${id}/streams`));
          setStreams(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      } else {
          setShowStreamSelect(false);
          fetchSubjects(id, null);
      }
  };

  const handleStreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      const name = streams.find(s => s.id === id)?.name || '';
      setSelections({ ...selections, streamId: id, streamName: name, subjectId: '', chapterId: '', topicId: '' });
      setSubjects([]); setChapters([]); setTopics([]);
      if (id) fetchSubjects(selections.classId, id);
  };

  const fetchSubjects = async (cId: string, sId: string | null) => {
      const path = sId ? `classes/${cId}/streams/${sId}/subjects` : `classes/${cId}/subjects`;
      const snap = await getDocs(collection(db, path));
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
  };

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      const name = subjects.find(s => s.id === id)?.name || '';
      setSelections({ ...selections, subjectId: id, subjectName: name, chapterId: '', topicId: '' });
      setChapters([]); setTopics([]);
      
      if (!id) return;

      const path = selections.streamId 
        ? `classes/${selections.classId}/streams/${selections.streamId}/subjects/${id}/chapters`
        : `classes/${selections.classId}/subjects/${id}/chapters`;
      const snap = await getDocs(collection(db, path));
      setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
  };

  const handleChapterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      const name = chapters.find(c => c.id === id)?.name || '';
      setSelections({ ...selections, chapterId: id, chapterName: name, topicId: '' });
      setTopics([]);

      if (!id) return;

      const path = selections.streamId
        ? `classes/${selections.classId}/streams/${selections.streamId}/subjects/${selections.subjectId}/chapters/${id}/topics`
        : `classes/${selections.classId}/subjects/${selections.subjectId}/chapters/${id}/topics`;
      const snap = await getDocs(collection(db, path));
      setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
  };

  // --- Upload Logic ---
  const handleUpload = async () => {
      if (!user) { onRequireAuth(); return; }
      if (!file || !selections.topicId) {
          setMessage({ text: "Please select all fields and a file.", type: 'error' });
          return;
      }

      setUploading(true);
      setMessage(null);

      try {
          // 1. Upload to Storage
          // FIX: Use 'notes/' path instead of 'teacher_notes/' to match storage rules
          const storageRef = ref(storage, `notes/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);

          // 2. Save to 'reviews' collection
          await addDoc(collection(db, "reviews"), {
              teacherEmail: user.email,
              teacherId: user.uid,
              fileName: file.name,
              fileUrl: url,
              uploadedAt: serverTimestamp(),
              status: 'pending',
              pathData: selections // Save the entire hierarchy for reconstruction
          });

          setMessage({ text: "Notes uploaded successfully! Sent for admin approval.", type: 'success' });
          setFile(null);
          // Refresh side panel
          fetchMyUploads();
      } catch (error: any) {
          console.error(error);
          // Better error message for user
          const msg = error.code === 'storage/unauthorized' 
            ? "Permission denied. Please ensure you are logged in correctly." 
            : "Upload failed. Please try again.";
          setMessage({ text: msg, type: 'error' });
      } finally {
          setUploading(false);
      }
  };

  // --- Admin Logic ---
  const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
          // Fetch pending reviews
          const q = query(collection(db, "reviews"), where("status", "==", "pending"));
          const snap = await getDocs(q);
          const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Sort descending by uploadedAt client-side
          reviews.sort((a: any, b: any) => {
              const timeA = a.uploadedAt?.seconds || 0;
              const timeB = b.uploadedAt?.seconds || 0;
              return timeB - timeA;
          });

          setPendingReviews(reviews);
      } catch (e) { console.error(e); }
      setLoadingReviews(false);
  };

  const handleApprove = async (review: any) => {
      const confirmAction = window.confirm("Are you sure you want to approve and publish these notes?");
      if (!confirmAction) return;

      try {
          const p = review.pathData;
          // Construct path based on whether stream exists
          let targetPath = `classes/${p.classId}`;
          if (p.streamId) targetPath += `/streams/${p.streamId}`;
          targetPath += `/subjects/${p.subjectId}/chapters/${p.chapterId}/topics/${p.topicId}`;

          const targetRef = doc(db, targetPath);
          const targetSnap = await getDoc(targetRef);

          let newField = 'notes_url';
          let updatedData: any = { name: p.topicName }; // Ensure topic name is set

          if (targetSnap.exists()) {
              const docData = targetSnap.data();
              let counter = 0;
              // Check notes_url, notes_url1, notes_url2... until we find a free slot
              while (true) {
                  const fieldName = counter === 0 ? 'notes_url' : `notes_url${counter}`;
                  if (docData[fieldName]) {
                      counter++;
                  } else {
                      newField = fieldName;
                      break;
                  }
              }
          }

          updatedData[newField] = review.fileUrl;

          // 1. Update public doc
          await setDoc(targetRef, updatedData, { merge: true });

          // 2. Update review status
          await updateDoc(doc(db, "reviews", review.id), { status: 'approved', approvedAt: serverTimestamp() });

          // 3. Update local state to show "Published"
          setPendingReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'approved' } : r));
          
          alert("Notes approved and published successfully!");
      } catch (error) {
          console.error("Approval failed", error);
          alert("Failed to approve notes.");
      }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">My Personal Notes</h1>
            <button onClick={onBack} className="text-gray-500 hover:text-gray-800 font-medium">Back to Dashboard</button>
        </div>

        {/* Tabs for Admin */}
        {isAdmin && (
            <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-2">
                <button 
                    onClick={() => setActiveTab('upload')} 
                    className={`pb-2 px-4 font-semibold ${activeTab === 'upload' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500'}`}
                >
                    Upload Notes
                </button>
                <button 
                    onClick={() => { setActiveTab('review'); fetchReviews(); }} 
                    className={`pb-2 px-4 font-semibold ${activeTab === 'review' ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-gray-500'}`}
                >
                    Review Queue {pendingReviews.filter(r => r.status === 'pending').length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingReviews.filter(r => r.status === 'pending').length}</span>}
                </button>
            </div>
        )}

        {activeTab === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Upload Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Upload New Material</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <select className="p-3 border rounded-lg" value={selections.classId} onChange={handleClassChange}>
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {showStreamSelect && (
                                <select className="p-3 border rounded-lg" value={selections.streamId} onChange={handleStreamChange}>
                                    <option value="">Select Stream</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            )}
                            <select className="p-3 border rounded-lg" value={selections.subjectId} onChange={handleSubjectChange} disabled={!subjects.length}>
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select className="p-3 border rounded-lg" value={selections.chapterId} onChange={handleChapterChange} disabled={!chapters.length}>
                                <option value="">Select Chapter</option>
                                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select className="p-3 border rounded-lg" value={selections.topicId} onChange={(e) => {
                                const t = topics.find(t => t.id === e.target.value);
                                setSelections({...selections, topicId: e.target.value, topicName: t?.name || ''});
                            }} disabled={!topics.length}>
                                <option value="">Select Topic</option>
                                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition">
                            <input 
                                type="file" 
                                id="fileUpload" 
                                className="hidden" 
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                accept=".pdf,.doc,.docx,.txt"
                            />
                            <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                                <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                                <span className="text-lg font-medium text-gray-700">{file ? file.name : "Click to select a file"}</span>
                                <span className="text-sm text-gray-500 mt-1">PDF, Word, or Text files</span>
                            </label>
                        </div>

                        {message && (
                            <div className={`mt-6 p-4 rounded-lg text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="mt-8 text-right">
                            <button 
                                onClick={handleUpload}
                                disabled={uploading || !file || !selections.topicId}
                                className="bg-primary-blue text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-dark transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Uploading...' : 'Submit Notes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Side Panel (My Submissions) */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full max-h-[800px] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">My Submissions</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                            {myUploads.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">No uploads yet.</p>
                            ) : (
                                myUploads.map((item) => (
                                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-800 text-sm line-clamp-1" title={item.fileName}>{item.fileName}</h4>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {item.status === 'approved' ? 'Published' : 'Under Review'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">
                                            {item.pathData?.className} &gt; {item.pathData?.subjectName}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {item.uploadedAt?.seconds ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'review' && (
            <div className="space-y-4">
                {loadingReviews ? (
                    <div className="text-center py-10"><div className="loader mx-auto"></div></div>
                ) : pendingReviews.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No pending reviews.</p>
                ) : (
                    pendingReviews.map(review => {
                        const isPublished = review.status === 'approved';
                        return (
                            <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg">{review.fileName}</h4>
                                    <p className="text-sm text-gray-600">
                                        By: {review.teacherEmail} <br/>
                                        Path: {review.pathData.className} &gt; {review.pathData.subjectName} &gt; {review.pathData.topicName}
                                    </p>
                                    <a href={review.fileUrl} target="_blank" rel="noreferrer" className="text-primary-blue text-sm hover:underline mt-2 inline-block">View File</a>
                                </div>
                                <button 
                                    onClick={() => !isPublished && handleApprove(review)}
                                    disabled={isPublished}
                                    className={`px-6 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
                                        isPublished 
                                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {isPublished ? 'Published' : 'Approve & Publish'}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default TeacherNotes;
