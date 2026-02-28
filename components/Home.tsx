
import React from 'react';
import { User } from '../types';

interface HomeProps {
  user: User | null;
  onGetStarted: () => void;
  onViewSubscription: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onGetStarted, onViewSubscription }) => {
  return (
    <main>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-44 bg-bg-soft min-h-[85vh] flex items-center">
        <div className="hidden md:block absolute inset-0 z-0 p-[50px]">
          <div 
            className="w-full h-full bg-contain bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2FBG-IMAGE-connversation150px.png?alt=media&token=6b59f09f-c8d2-4ef0-8089-f20c31318fce')" }}
          ></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl text-center lg:text-left mx-auto lg:mx-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
              India's <span className="text-primary-blue">Trusted &<br className="hidden md:block"/> Affordable</span>
              Career <br className="md:hidden"/> Counselling Platform
            </h1>
            <p className="text-base md:text-lg text-gray-700 font-medium mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Unlock your life journey with Jurniq Career. We provide the best and most trusted solutions to guide your future.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button 
                onClick={onGetStarted} 
                className="bg-primary-blue text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-transform transform hover:scale-105 shadow-lg shadow-blue-200 w-full sm:w-auto text-center"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Importance of Career Guidance */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Importance of <span className="text-primary-blue">Career Guidance</span></h2>
            <p className="text-gray-600 max-w-2xl mx-auto">It assists in making the best career choice. It affects different areas of your life, such as:</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Clarity and Career", desc: "Career guidance helps you clearly understand the right path based on your interests and abilities. It removes confusion.", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Fimportance1.jpg?alt=media&token=e51f198a-7ca2-4ed4-8cd9-aed00d73ed60" },
              { title: "Self Discovery", desc: "It helps you identify your strengths, weaknesses, skills, and true interests. Gain a deeper understanding of yourself.", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Fimportance2.jpg?alt=media&token=da0e3ea9-d297-4e0d-97cf-03060e288dcf" },
              { title: "Future Success", desc: "Career guidance prepares you for long-term growth and stability. It increases your chances of success and satisfaction.", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Fimportance3.jpg?alt=media&token=7604127a-d4aa-423f-b3bb-26612ae791a0" }
            ].map((item, idx) => (
              <div key={idx} className="bg-blue-50 rounded-2xl p-8 text-center card-hover border border-blue-100 transition-all hover:-translate-y-2">
                <div className="h-48 w-full flex items-center justify-center mb-4 overflow-hidden">
                  <img src={item.img} className="max-w-full max-h-full object-contain" alt={item.title} onError={(e) => { e.currentTarget.src = 'https://picsum.photos/300/200'; }} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Why Jurniq? */}
      <section className="py-20 bg-bg-soft">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why <span className="text-primary-blue">Jurniq Career?</span></h2>
            <p className="text-gray-600">Guiding students to discover their true potential. Supporting parents and teachers to make confident decisions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { title: "Right Choices", subtitle: "Start with Clear Guidance", desc: "Jurniq Career replaces confusion with clarity by helping students identify the right career path confidently.", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Frightchoice.png?alt=media&token=07d246b1-6266-4319-9b2c-1bb3f0c28421" },
               { title: "Understanding Strengths", subtitle: "Before Choosing Futures", desc: "Our Personalised AI 'JurniQ AI' powered tools help students discover their interests, abilities, and potential to align education with fit.", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Funderstanding%20strengths_300.png?alt=media&token=588cdbd2-9351-4cde-9ffb-5c71031f2f00" },
               { title: "Planning Careers", subtitle: "With Long-Term Vision", desc: "We prepare learners for real-world opportunities and future industry demands, creating sustainable career success.", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Flong%20term%20vision.png?alt=media&token=093cef29-9a13-474f-b577-63f4e907e871" }
             ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover text-center transition-all hover:-translate-y-2">
                    <div className="h-48 w-full flex items-center justify-center mb-4 overflow-hidden">
                        <img src={item.img} className="max-w-full max-h-full object-contain" alt={item.title} onError={(e) => { e.currentTarget.src = 'https://picsum.photos/300/200'; }}/>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                    <p className="text-primary-blue font-semibold mb-2 text-sm">{item.subtitle}</p>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* 4. AI Banner Section */}
      <section className="py-10 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="bg-white border-2 border-primary-blue rounded-3xl p-4 md:p-6 relative shadow-lg">
            <div className="relative w-full pt-[56.25%] rounded-2xl overflow-hidden bg-black">
              <iframe 
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/UZ7Z0tUwwU4" 
                title="Jurniq Careers Introduction" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen>
              </iframe>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Features Section */}
      <section id="features-section" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our <span className="text-primary-blue">Features</span></h2>
            <p className="text-gray-600">Guiding every student's journey with real-time insights.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { role: "Student", icon: "https://cdn-icons-png.flaticon.com/512/201/201818.png", points: ["Find career based on marks and interest", "Sports career based on skill", "Business ideas and financial support"] },
              { role: "Parent", icon: "https://cdn-icons-png.flaticon.com/512/3048/3048122.png", points: ["Check children ability", "School/College fees & seat availability", "Access Student Dashboard"] },
              { role: "Teacher", icon: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png", points: ["Teach based on IQ level", "Upload/Download notes", "Get study videos & materials"] }
            ].map((feature, idx) => (
                <div key={idx} className="bg-bg-soft rounded-3xl border border-gray-200 overflow-hidden card-hover transition-all hover:-translate-y-2">
                    <div className="p-8 text-center bg-white border-b border-gray-100">
                        <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center flex-shrink-0">
                            <img src={feature.icon} className="w-12 h-12 object-contain" alt={feature.role} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">{feature.role} <span className="text-primary-blue">Section</span></h3>
                    </div>
                    <div className="p-8">
                        <h4 className="font-bold text-gray-900 mb-4">What you get:</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                           {feature.points.map((pt, i) => (
                             <li key={i} className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                {pt}
                            </li>
                           ))}
                        </ul>
                        <button onClick={onViewSubscription} className="w-full mt-8 border border-primary-blue text-primary-blue py-2 rounded-full font-semibold hover:bg-primary-blue hover:text-white transition-colors">View More</button>
                    </div>
                </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
