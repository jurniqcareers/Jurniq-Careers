
import { API } from '@/services/apiConfig';
import React, { useState } from 'react';

const ContactUs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Construct payload
    const payload = {
        firstName: formData.get('first-name'),
        lastName: formData.get('last-name'),
        email: formData.get('contact-email'),
        message: formData.get('message')
    };

    try {
      const response = await fetch(API.sendContactEmail, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus({ type: 'success', message: 'Thank you! Your message has been sent successfully.' });
        form.reset();
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus({ type: 'error', message: 'An error occurred. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      {/* Section 1: Hero */}
      <section className="hero-bg py-24 md:py-32">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">Get In Touch</h1>
          <p className="mt-4 text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
            We'd love to hear from you. Whether you have a question about our features, pricing, or anything else, our team is ready to answer all your questions.
          </p>
        </div>
      </section>

      {/* Section 2: Contact Form & Details */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Contact Info */}
            <div className="md:col-span-5 bg-primary-blue text-white p-8 rounded-2xl shadow-lg h-full">
              <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
              <p className="mb-8 text-base opacity-90">Fill up the form and our team will get back to you within 24 hours.</p>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <a href="tel:+919650438341" className="text-base hover:underline text-white">+91 96504 38341</a>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <a href="mailto:suraj.kumar@jurniqcareers.com" className="text-base hover:underline text-white">suraj.kumar@jurniqcareers.com</a>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-base">C-145, Sharmik Kunj, Sec-66, Noida, U.P (India)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="md:col-span-7 bg-white p-8 rounded-2xl shadow-lg">
              <form onSubmit={handleSubmit} id="contact-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" name="first-name" id="first-name" autoComplete="given-name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" name="last-name" id="last-name" autoComplete="family-name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" />
                  </div>
                </div>
                <div className="mb-6">
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" name="contact-email" id="contact-email" autoComplete="email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required />
                </div>
                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea id="message" name="message" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" required></textarea>
                </div>
                <div className="text-right">
                  <button type="submit" disabled={loading} className="bg-primary-blue text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
                {status && (
                  <div className={`mt-4 text-left font-medium ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {status.message}
                  </div>
                )}
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Section 3: Map */}
      <section>
        <div className="w-full">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.58332598715!2d77.37854641508208!3d28.61003038242567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cef006a36ad5b%3A0x23b225f7b88b4a3c!2sSharmik%20Kunj!5e0!3m2!1sen!2sin!4v1664455845012!5m2!1sen!2sin" 
            className="w-full h-96 border-0" 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
