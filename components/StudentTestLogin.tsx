import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebaseService';
import { collection, query, where, getDocs } from 'firebase/firestore';

const StudentTestLogin: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const q = query(collection(db, "tests"), where("password", "==", password.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Invalid test password. Please check and try again.");
            } else {
                const testDoc = querySnapshot.docs[0];
                const testData = testDoc.data();
                
                if (testData.status === 'completed') {
                    setError("This test has already been completed.");
                } else {
                    // Navigate to the test page with the testId
                    navigate(`/test?testId=${testDoc.id}`);
                }
            }
        } catch (err) {
            console.error("Error fetching test:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fpexels-knownasovan-57690.jpg?alt=media&token=0fd7a6a5-92da-4b03-bded-37fea17239e2')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative">
                <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 text-lg font-bold">&times;</button>
                
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">
                    <i className="fas fa-user-graduate"></i>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Student Portal</h2>
                <p className="text-gray-600 mb-8">Enter the 6-character password provided by your teacher to access your test.</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <input 
                            type="text" 
                            required
                            maxLength={6}
                            className="w-full border-2 border-gray-300 rounded-xl p-4 text-center text-2xl font-mono tracking-[0.5em] uppercase focus:border-primary-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            placeholder="XXXXXX"
                            value={password}
                            onChange={e => setPassword(e.target.value.toUpperCase())}
                        />
                        {error && <p className="text-red-500 text-sm mt-3 font-medium">{error}</p>}
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading || password.length < 6}
                        className="w-full bg-primary-blue text-white font-bold py-4 rounded-xl hover:bg-primary-dark transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Enter Test'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentTestLogin;
