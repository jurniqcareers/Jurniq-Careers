
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-blue text-white mt-auto">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2FUntitled%20(6000%20x%203000%20px).png?alt=media&token=1a76c5a6-b76f-4d82-90fc-181979b6c59d" 
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/240x120/3BB0FF/FFFFFF?text=Footer+Logo'; }}
            alt="Footer Logo" 
            style={{ height: '120px', maxWidth: '240px' }} 
            className="mx-auto mb-4 rounded-md object-contain shrink-0" 
          />
          <div className="flex justify-center flex-wrap gap-x-8 gap-y-2 mb-8 text-lg font-medium">
            <a href="#" className="hover:underline opacity-90 hover:opacity-100">Term and Condition</a>
            <a href="#" className="hover:underline opacity-90 hover:opacity-100">Privacy Policy</a>
            <a href="#" className="hover:underline opacity-90 hover:opacity-100">About Us</a>
            <a href="#" className="hover:underline opacity-90 hover:opacity-100">Contact us</a>
          </div>
          <div className="flex justify-center space-x-6 mb-8">
            <a href="https://www.facebook.com/profile.php?id=61580102213164" target="_blank" rel="noopener noreferrer" className="text-3xl hover:text-blue-200 transition-colors"><i className="fab fa-facebook"></i></a>
            <a href="https://x.com/jurniqcareers" target="_blank" rel="noopener noreferrer" className="text-3xl hover:text-gray-300 transition-colors"><i className="fa-brands fa-x-twitter"></i></a>
            <a href="https://www.linkedin.com/company/jurniq-careers/" target="_blank" rel="noopener noreferrer" className="text-3xl hover:text-blue-300 transition-colors"><i className="fab fa-linkedin"></i></a>
            <a href="https://www.instagram.com/jurniqcareers/" target="_blank" rel="noopener noreferrer" className="text-3xl hover:text-pink-300 transition-colors"><i className="fab fa-instagram"></i></a>
            <a href="https://www.youtube.com/@JurniqCareers" target="_blank" rel="noopener noreferrer" className="text-3xl hover:text-red-400 transition-colors"><i className="fab fa-youtube"></i></a>
          </div>
          <p className="text-sm text-blue-100">&copy; 2025 Jurniq Careers. All rights reserved. | Made with ❤️ by <a href ="#" className="underline hover:text-white">Balit&Sons Technologies</a> </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
