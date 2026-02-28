
import React from 'react';

interface ReminderProps {
  onBack: () => void;
}

const Reminder: React.FC<ReminderProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-lg w-full">
            <div className="w-24 h-24 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                <i className="fas fa-bell"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reminders</h1>
            <p className="text-gray-600 mb-8">This feature is coming soon! Stay tuned for updates on important dates and deadlines.</p>
            <button onClick={onBack} className="bg-primary-blue text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-dark transition shadow-lg">
                Back to Dashboard
            </button>
        </div>
    </div>
  );
};

export default Reminder;
