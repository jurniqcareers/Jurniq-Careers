import React, { useState, useEffect } from 'react';
import { User, Blog } from '../types';
import { db } from '../services/firebaseService';
import { collection, query, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';

interface BlogsProps {
  user: User | null;
}

const Blogs: React.FC<BlogsProps> = ({ user }) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [viewingBlog, setViewingBlog] = useState<Blog | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Partial<Blog>>({});
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.email === 'jurniqcareers@gmail.com' || user?.email === 'chairman@balitandsons.com';

  useEffect(() => {
    // Check if user is author
    const checkAuthor = async () => {
      if (!user) return;
      if (isAdmin) {
        setIsAuthor(true);
        return;
      }
      try {
        const authorDoc = await getDoc(doc(db, 'authors', user.uid));
        if (authorDoc.exists()) {
          setIsAuthor(true);
        }
      } catch (e) {
        console.error("Error checking author status", e);
      }
    };
    checkAuthor();
  }, [user, isAdmin]);

  useEffect(() => {
    // Fetch blogs
    const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Blog[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Blog));
      setBlogs(list);
    }, (error) => {
      console.error("Error fetching blogs:", error);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!editingBlog.title || !editingBlog.content) {
      alert("Title and content are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingBlog.id) {
        // Update
        await updateDoc(doc(db, 'blogs', editingBlog.id), {
          ...editingBlog,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create
        await addDoc(collection(db, 'blogs'), {
          ...editingBlog,
          authorId: user?.uid,
          authorName: user?.displayName || user?.name || 'Anonymous',
          createdAt: serverTimestamp()
        });
      }
      setIsEditing(false);
      setEditingBlog({});
    } catch (e) {
      console.error("Error saving blog", e);
      alert("Failed to save blog.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    try {
      await deleteDoc(doc(db, 'blogs', id));
      if (viewingBlog?.id === id) setViewingBlog(null);
    } catch (e) {
      console.error("Error deleting blog", e);
      alert("Failed to delete blog.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const d = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  // Editor View
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[100px] pb-20 px-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingBlog.id ? 'Edit Blog' : 'Write a New Blog'}</h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-800">Cancel</button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
              <input 
                value={editingBlog.title || ''} 
                onChange={e => setEditingBlog({...editingBlog, title: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue"
                placeholder="Enter blog title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Subhead (Optional)</label>
              <input 
                value={editingBlog.subhead || ''} 
                onChange={e => setEditingBlog({...editingBlog, subhead: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue"
                placeholder="Enter a brief subhead"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Featured Image URL (Optional)</label>
              <input 
                value={editingBlog.featuredImage || ''} 
                onChange={e => setEditingBlog({...editingBlog, featuredImage: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Content</label>
              <div className="bg-white rounded-lg overflow-hidden border border-gray-300">
                <ReactQuill 
                  theme="snow" 
                  value={editingBlog.content || ''} 
                  onChange={content => setEditingBlog({...editingBlog, content})} 
                  modules={modules}
                  className="h-96 mb-12"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-primary-blue text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors"
              >
                {saving ? 'Saving...' : 'Publish Blog'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single Blog View
  if (viewingBlog) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[100px] pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setViewingBlog(null)} className="flex items-center text-gray-500 hover:text-primary-blue mb-6 transition-colors text-sm font-medium">
            <i className="fas fa-arrow-left mr-2"></i> Back to Blogs
          </button>
          
          <article className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {viewingBlog.featuredImage && (
              <div className="w-full h-[300px] md:h-[400px] bg-gray-100">
                <img src={viewingBlog.featuredImage} alt={viewingBlog.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
            )}
            <div className="p-6 md:p-10">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">{viewingBlog.title}</h1>
              {viewingBlog.subhead && (
                <p className="text-lg text-gray-600 mb-6">{viewingBlog.subhead}</p>
              )}
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-primary-blue font-bold text-lg mr-3">
                    {viewingBlog.authorName?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{viewingBlog.authorName}</p>
                    <p className="text-xs text-gray-500">{formatDate(viewingBlog.createdAt)}</p>
                  </div>
                </div>
                
                {isAuthor && (isAdmin || user?.uid === viewingBlog.authorId) && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingBlog(viewingBlog); setIsEditing(true); }} className="text-blue-500 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50 transition-colors">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleDelete(viewingBlog.id)} className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                )}
              </div>
              
              <div 
                className="prose prose-blue max-w-none prose-headings:font-bold prose-p:text-gray-700 prose-a:text-primary-blue"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingBlog.content) }}
              />
            </div>
          </article>
        </div>
      </div>
    );
  }

  const featuredBlog = blogs.length > 0 ? blogs[0] : null;
  const regularBlogs = blogs.length > 1 ? blogs.slice(1) : [];

  // List View
  return (
    <div className="min-h-screen bg-gray-50 pt-[100px] pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Jurniq Blog</h1>
            <p className="text-gray-600 text-base md:text-lg">Insights and stories to guide your professional journey.</p>
          </div>
          {isAuthor && (
            <button 
              onClick={() => { setEditingBlog({}); setIsEditing(true); }}
              className="mt-4 md:mt-0 bg-primary-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center shadow-sm"
            >
              <i className="fas fa-pen mr-2"></i> Write a Post
            </button>
          )}
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-newspaper text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No blogs yet</h3>
            <p className="text-gray-500 text-sm">Check back later for new content.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map(blog => (
              <div 
                key={blog.id} 
                onClick={() => setViewingBlog(blog)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full group"
              >
                {blog.featuredImage ? (
                  <div className="h-48 overflow-hidden bg-gray-100">
                    <img src={blog.featuredImage} alt={blog.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center'); e.currentTarget.parentElement!.innerHTML = '<i class="fas fa-image text-3xl text-gray-300"></i>'; }} />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                    <i className="fas fa-newspaper text-3xl text-gray-300"></i>
                  </div>
                )}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center text-xs text-gray-500 mb-2 font-medium">
                    <span>{formatDate(blog.createdAt)}</span>
                    <span className="mx-2">•</span>
                    <span>{blog.authorName}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-primary-blue transition-colors">{blog.title}</h3>
                  {blog.subhead && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-grow">{blog.subhead}</p>
                  )}
                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center text-primary-blue font-semibold text-sm">
                    Read Article <i className="fas fa-arrow-right ml-1.5 text-xs"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blogs;
