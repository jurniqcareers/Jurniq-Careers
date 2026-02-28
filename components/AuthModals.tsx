import React, { useState } from 'react';
import { auth, storage, db } from '../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

interface AuthModalsProps {
  view: 'login' | 'register' | 'forgot' | null;
  onClose: () => void;
  onSwitch: (view: 'login' | 'register' | 'forgot') => void;
}

const AuthModals: React.FC<AuthModalsProps> = ({ view, onClose, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);

  if (!view) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      if (cred.user && !cred.user.emailVerified) {
        setError('Please verify your email before logging in.');
        await auth.signOut();
      } else {
        onClose();
      }
    } catch (err: any) {
      setError('Failed to login. Check credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      let photoURL = "https://placehold.co/40x40/3BB0FF/FFFFFF?text=J";
      
      if (cred.user) {
          if (profilePic) {
            const storageRef = ref(storage, `user_profile/${cred.user.uid}`);
            await uploadBytes(storageRef, profilePic);
            photoURL = await getDownloadURL(storageRef);
          }

          await cred.user.updateProfile({ displayName: name, photoURL });
          await cred.user.sendEmailVerification();
          
          await setDoc(doc(db, "users", cred.user.uid), {
            name, phone, email, uid: cred.user.uid, profile_pic: photoURL, createdAt: new Date()
          });
      }

      await auth.signOut();
      setSuccess(`Verification email sent to ${email}. Please verify and login.`);
      setTimeout(() => onSwitch('login'), 5000);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await auth.sendPasswordResetEmail(email);
        setSuccess("Password reset link sent to your email.");
    } catch (err) {
        setError("Failed to send reset email.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-3xl font-bold">&times;</button>
        <div className="text-center mb-6"><div className="text-2xl font-bold text-primary-blue inline-block">Jurniq Careers</div></div>
        
        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4 text-sm">{success}</p>}

        {view === 'login' && (
          <>
            <form onSubmit={handleLogin}>
              <div className="mb-4"><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required /></div>
              <div className="mb-6">
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
                <button type="button" onClick={() => onSwitch('forgot')} className="text-sm text-primary-blue hover:underline block text-right mt-2 w-full">Forgotten password?</button>
              </div>
              <button type="submit" className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold hover:bg-primary-dark">Log in</button>
            </form>
            <button onClick={() => onSwitch('register')} className="w-full mt-4 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600">Create new account</button>
          </>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[70vh] overflow-y-auto">
             <div className="flex flex-col items-center mb-4">
                <label className="cursor-pointer">
                    {profilePic ? (
                        <img src={URL.createObjectURL(profilePic)} className="w-24 h-24 rounded-full object-cover border-2 border-gray-300" alt="Preview"/>
                    ) : (
                        <div className="w-24 h-24 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 bg-gray-100">Photo</div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && setProfilePic(e.target.files[0])} />
                </label>
                <span className="text-xs text-gray-500 mt-2">Upload a photo</span>
            </div>
            <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
            <input type="tel" placeholder="Phone No." value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
            <button type="submit" className="w-full mt-6 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600">Create new account</button>
            <button type="button" onClick={() => onSwitch('login')} className="w-full mt-2 text-primary-blue hover:underline">Already have an account?</button>
          </form>
        )}

        {view === 'forgot' && (
            <form onSubmit={handleForgot}>
                <div className="mb-4"><input type="email" placeholder="Enter registered email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required /></div>
                <button type="submit" className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold hover:bg-primary-dark">Send Reset Link</button>
                <button type="button" onClick={() => onSwitch('login')} className="w-full mt-4 text-primary-blue hover:underline">Back to Login</button>
            </form>
        )}
      </div>
    </div>
  );
};

export default AuthModals;