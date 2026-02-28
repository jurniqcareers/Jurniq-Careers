
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { generateChildAptitudeTest } from '../services/geminiService';

interface TeachAbilityProps {
  user: User | null;
  onRequireAuth: () => void;
  onBack: () => void;
}

const TeachAbility: React.FC<TeachAbilityProps> = ({ user, onRequireAuth, onBack }) => {
  const [view, setView] = useState<'dashboard' | 'create' | 'report'>('dashboard');
  const [students, setStudents] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  
  // Create Test Form
  const [formData, setFormData] = useState({
      name: '',
      class: '',
      email: '',
      type: 'General',
      sector: '',
      job: '',
      spec: ''
  });
  const [creating, setCreating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<{link: string, pass: string} | null>(null);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');

  // Report View
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  useEffect(() => {
      if (!user) { onRequireAuth(); return; }

      // Listen for Students
      const qStudents = query(collection(db, `teachers/${user.uid}/students`));
      const unsubStudents = onSnapshot(qStudents, (snap) => {
          setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Listen for Tests
      const qTests = query(collection(db, "tests"), where("teacherId", "==", user.uid));
      const unsubTests = onSnapshot(qTests, (snap) => {
          setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubStudents(); unsubTests(); };
  }, [user]);

  const handleOpenEmailModal = (testLink?: string, testPass?: string, studentName?: string, testType?: string) => {
      const link = testLink || generatedTest?.link;
      const pass = testPass || generatedTest?.pass;
      const name = studentName || formData.name;
      const type = testType || formData.type;

      if (!link || !pass) return;

      const content = `Dear ${name},

Your Teacher ${user?.displayName || 'User'} has created one ${type} Aptitude Test for you.

Please click the link below to start the test:
${link}

Password: ${pass}

Good luck!
Regards,
${user?.displayName || 'Teacher'}`;
      setEmailContent(content);
      setEmailModalOpen(true);
  };

  const handleSendEmail = () => {
      // In a real app, this would call a backend API to send the email.
      // For this demo, we'll simulate it with a mailto link or just a success message.
      const subject = encodeURIComponent(`New Test Assigned: ${formData.type} Aptitude Test`);
      const body = encodeURIComponent(emailContent);
      window.open(`mailto:${formData.email}?subject=${subject}&body=${body}`);
      setEmailModalOpen(false);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setCreating(true);

      try {
          // 1. Generate Questions via AI
          const questions = await generateChildAptitudeTest(
              formData.class, 
              formData.type as 'General' | 'Specific', 
              formData.type === 'Specific' ? `${formData.job} (${formData.spec}) in ${formData.sector}` : undefined
          );

          if (!questions || questions.length === 0) throw new Error("AI Generation Failed");

          // 2. Save Student Record (Idempotent)
          const studentRef = doc(db, `teachers/${user.uid}/students`, formData.email);
          await setDoc(studentRef, {
              name: formData.name,
              class: formData.class,
              email: formData.email
          }, { merge: true });

          // 3. Create Test Record
          const password = Math.random().toString(36).substring(2, 8).toUpperCase();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours

          const testRef = await addDoc(collection(db, "tests"), {
              teacherId: user.uid,
              studentEmail: formData.email,
              studentName: formData.name,
              studentClass: formData.class,
              password: password,
              createdAt: serverTimestamp(),
              expiresAt: expiresAt,
              status: 'pending',
              questions: questions,
              type: formData.type,
              jobDetails: formData.type === 'Specific' ? { sector: formData.sector, job: formData.job, specialization: formData.spec } : null
          });

          // 4. Show Result
          const link = `${window.location.origin}/#/test?testId=${testRef.id}`;
          setGeneratedTest({ link, pass: password });

      } catch (error) {
          console.error(error);
          alert("Failed to create test. Please try again.");
      } finally {
          setCreating(false);
      }
  };

  const getLatestTest = (email: string) => {
      return tests
        .filter(t => t.studentEmail === email && t.status === 'completed')
        .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())[0];
  };

  const handleGenerateAnalysis = async (report: any) => {
      setIsGeneratingAnalysis(true);
      try {
          const answersForAI = report.questions.map((q: any, i: number) => ({
              question: q.question,
              answer: report.answers[i] !== null && report.answers[i] !== '' ? (typeof report.answers[i] === 'number' && q.options ? q.options[report.answers[i] as number] : report.answers[i]) : "Skipped",
              correct: q.correctAnswerIndex !== undefined ? report.answers[i] === q.correctAnswerIndex : true
          }));

          const analysisResult = await analyzeChildAptitude(
              answersForAI, 
              report.studentClass || 'Unknown', 
              report.type,
              report.type === 'Specific' ? `${report.jobDetails?.job} (${report.jobDetails?.specialization})` : undefined,
              report.iqScore
          );

          if (analysisResult) {
              const testRef = doc(db, "tests", report.id);
              await updateDoc(testRef, {
                  analysis: analysisResult.analysis || "Analysis completed.",
                  verdict: analysisResult.verdict || "N/A",
                  swot: analysisResult.swot || null,
                  teachingPlan: analysisResult.teachingPlan || null,
                  suggestions: analysisResult.suggestions || null
              });
              alert("Analysis generated successfully!");
          } else {
              alert("Failed to generate analysis. Please try again.");
          }
      } catch (e) {
          console.error(e);
          alert("An error occurred while generating the analysis.");
      } finally {
          setIsGeneratingAnalysis(false);
      }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800 font-medium">Back</button>
            </div>

            {view === 'dashboard' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                            <h3 className="text-gray-500 font-semibold mb-2">Total Students</h3>
                            <p className="text-4xl font-bold text-blue-600">{students.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                            <h3 className="text-gray-500 font-semibold mb-2">Tests Created</h3>
                            <p className="text-4xl font-bold text-green-600">{tests.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                            <h3 className="text-gray-500 font-semibold mb-2">Avg. IQ Score</h3>
                            <p className="text-4xl font-bold text-purple-600">
                                {(() => {
                                    const scores = students.filter(s => s.iq).map(s => s.iq);
                                    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 'N/A';
                                })()}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end mb-6">
                        <button onClick={() => setView('create')} className="bg-primary-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition shadow-lg">
                            + Create New Test
                        </button>
                    </div>

                    {/* Students Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Class</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Email</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">IQ Score</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No students yet. Create a test to add one.</td></tr>
                                    ) : (
                                        students.map((s, i) => {
                                            const hasReport = !!getLatestTest(s.email);
                                            const pendingTest = tests.find(t => t.studentEmail === s.email && t.status === 'pending');
                                            return (
                                                <tr key={i} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                                                    <td className="px-6 py-4 text-gray-600">{s.class}</td>
                                                    <td className="px-6 py-4 text-gray-600">{s.email}</td>
                                                    <td className="px-6 py-4 font-bold text-gray-800">{s.iq || '-'}</td>
                                                    <td className="px-6 py-4 flex gap-3">
                                                        <button 
                                                            disabled={!hasReport}
                                                            onClick={() => { setSelectedStudentEmail(s.email); setView('report'); }}
                                                            className={`text-sm font-semibold ${hasReport ? 'text-blue-600 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
                                                        >
                                                            View Report
                                                        </button>
                                                        {pendingTest && (
                                                            <button 
                                                                onClick={() => {
                                                                     setFormData({ ...formData, name: s.name, email: s.email, type: pendingTest.type });
                                                                     setGeneratedTest({ link: `${window.location.origin}/#/test?testId=${pendingTest.id}`, pass: pendingTest.password });
                                                                     handleOpenEmailModal(`${window.location.origin}/#/test?testId=${pendingTest.id}`, pendingTest.password, s.name, pendingTest.type);
                                                                }}
                                                                className="text-sm font-semibold text-green-600 hover:underline"
                                                            >
                                                                Send Link
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {view === 'create' && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-2xl mx-auto">
                    {!generatedTest ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Aptitude Test</h2>
                            <form onSubmit={handleCreateTest} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                                    <input required className="w-full border rounded-lg p-3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                    <input required className="w-full border rounded-lg p-3" placeholder="e.g. 10th" value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input required type="email" className="w-full border rounded-lg p-3" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                                    <select className="w-full border rounded-lg p-3" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                        <option value="General">General Aptitude</option>
                                        <option value="Specific">Specific Career</option>
                                    </select>
                                </div>
                                {formData.type === 'Specific' && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <input required placeholder="Sector" className="border rounded-lg p-3" value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} />
                                        <input required placeholder="Job" className="border rounded-lg p-3" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} />
                                        <input required placeholder="Specialization" className="border rounded-lg p-3" value={formData.spec} onChange={e => setFormData({...formData, spec: e.target.value})} />
                                    </div>
                                )}
                                <div className="flex gap-4 mt-6">
                                    <button type="button" onClick={() => setView('dashboard')} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300">Cancel</button>
                                    <button type="submit" disabled={creating} className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-lg hover:bg-primary-dark">
                                        {creating ? 'Generating...' : 'Generate Test'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i className="fas fa-check"></i></div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Test Generated!</h2>
                            <p className="text-gray-600 mb-6">Share these details with the student.</p>
                            <div className="bg-gray-50 p-4 rounded-lg text-left mb-4 border border-gray-200">
                                <p className="text-sm text-gray-500">Test Link:</p>
                                <p className="text-blue-600 font-medium break-all mb-3">{generatedTest.link}</p>
                                <p className="text-sm text-gray-500">Password:</p>
                                <p className="text-gray-800 font-mono text-lg font-bold">{generatedTest.pass}</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => handleOpenEmailModal()} className="flex-1 bg-blue-100 text-blue-700 font-bold py-3 rounded-lg hover:bg-blue-200 transition-colors">
                                    <i className="fas fa-envelope mr-2"></i> Send Email
                                </button>
                                <button onClick={() => { setGeneratedTest(null); setView('dashboard'); }} className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-lg hover:bg-primary-dark">Done</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Email Modal */}
            {emailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEmailModalOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-4">Send Test Invitation</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
                            <input disabled value={formData.email} className="w-full border rounded-lg p-2 bg-gray-100 text-gray-600" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message:</label>
                            <textarea 
                                rows={10}
                                className="w-full border rounded-lg p-3 font-mono text-sm"
                                value={emailContent}
                                onChange={e => setEmailContent(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setEmailModalOpen(false)} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button onClick={handleSendEmail} className="flex-1 bg-primary-blue text-white font-bold py-2 rounded-lg hover:bg-primary-dark">
                                <i className="fas fa-paper-plane mr-2"></i> Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'report' && selectedStudentEmail && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto animate-fade-in-up">
                    {(() => {
                        const report = getLatestTest(selectedStudentEmail);
                        if (!report) return <div>No report found.</div>;
                        return (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">{report.studentName}'s Report</h2>
                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    <div className="bg-blue-50 p-6 rounded-xl">
                                        <h3 className="font-bold text-blue-800 mb-2">Results</h3>
                                        <p className="text-4xl font-extrabold text-blue-600 mb-1">{report.iqScore}</p>
                                        <p className="text-sm text-blue-700 uppercase tracking-wider font-semibold">Estimated IQ / Score</p>
                                    </div>
                                    <div className="bg-green-50 p-6 rounded-xl relative">
                                        <h3 className="font-bold text-green-800 mb-2">AI Analysis</h3>
                                        <p className="text-green-900 text-sm leading-relaxed">{report.analysis || report.verdict || "Analysis not available."}</p>
                                        {(!report.swot || !report.teachingPlan) && (
                                            <button 
                                                onClick={() => handleGenerateAnalysis(report)}
                                                disabled={isGeneratingAnalysis}
                                                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {isGeneratingAnalysis ? 'Generating...' : 'Generate Full AI Report'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {report.swot && (
                                    <div className="mb-8">
                                        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">SWOT Analysis</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><i className="fas fa-arrow-up"></i> Strengths</h4>
                                                <ul className="list-disc pl-5 text-sm text-green-900 space-y-1">
                                                    {report.swot.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><i className="fas fa-arrow-down"></i> Weaknesses</h4>
                                                <ul className="list-disc pl-5 text-sm text-red-900 space-y-1">
                                                    {report.swot.weaknesses?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><i className="fas fa-lightbulb"></i> Opportunities</h4>
                                                <ul className="list-disc pl-5 text-sm text-blue-900 space-y-1">
                                                    {report.swot.opportunities?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                                <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><i className="fas fa-shield-alt"></i> Threats</h4>
                                                <ul className="list-disc pl-5 text-sm text-orange-900 space-y-1">
                                                    {report.swot.threats?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {report.teachingPlan && (
                                    <div className="mb-8 bg-purple-50 p-6 rounded-xl border border-purple-100">
                                        <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2"><i className="fas fa-chalkboard-teacher"></i> Personalized Teaching Plan</h3>
                                        <p className="text-purple-900 text-sm leading-relaxed whitespace-pre-wrap">{report.teachingPlan}</p>
                                    </div>
                                )}

                                {report.suggestions && report.suggestions.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Career Suggestions</h3>
                                        <div className="space-y-3">
                                            {report.suggestions.map((s: any, i: number) => (
                                                <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                    <h4 className="font-bold text-gray-900">{s.career}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">{s.reason}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Question Breakdown</h3>
                                <div className="space-y-4">
                                    {report.questions.map((q: any, i: number) => (
                                        <div key={i} className="border border-gray-200 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">{i+1}. {q.question}</p>
                                            <p className="text-sm text-gray-600"><span className="font-bold">Student Answer:</span> {report.answers[i] || 'Skipped'}</p>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setView('dashboard')} className="mt-8 bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-300">Close Report</button>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    </div>
  );
};

export default TeachAbility;
