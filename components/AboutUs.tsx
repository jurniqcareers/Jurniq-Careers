
import React from 'react';

const AboutUs: React.FC = () => {
  return (
    <main>
      <section className="hero-bg py-24 md:py-32">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            We're Building India's Future <span className="text-primary-blue"><br />One Career at a Time</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
            We're not just an EdTech platform; we are a Personalised AI 'JurniQ AI' powered solution to the deep, systemic educational anxiety felt by families nationwide. Our purpose is to replace confusion with clarity, and pressure with a confident plan for the future.
          </p>
        </div>
      </section>

      <section id="stats-section" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">India's Guidance Gap: The Crisis We're Solving</h2>
            <p className="text-gray-600 mt-2 text-base max-w-3xl mx-auto">
              The demand for quality career guidance is a direct result of critical deficiencies in our traditional education system. Here's the reality.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-16">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-5xl font-bold text-primary-blue">93%</h3>
              <p className="mt-2 text-base font-semibold text-gray-800">Percent Unaware</p>
              <p className="text-gray-600 mt-1 text-base">Over 93% of students know ten or fewer career options, creating immense confusion and limiting potential.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-5xl font-bold text-primary-blue">50%</h3>
              <p className="mt-2 text-base font-semibold text-gray-800">Percent Unemployable</p>
              <p className="text-gray-600 mt-1 text-base">An outdated, exam-centric system means as many as half of all graduates are considered unemployable.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-5xl font-bold text-primary-blue">1:3,000</h3>
              <p className="mt-2 text-base font-semibold text-gray-800">Student-to-Counselor Ratio</p>
              <p className="text-gray-600 mt-1 text-base">The staggering deficit of qualified counselors in India, which only a scalable tech solution can address.</p>
            </div>
          </div>

          <div className="bg-primary-blue-lighter p-8 rounded-xl max-w-4xl mx-auto">
            <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='350' viewBox='0 0 800 350' style='background-color:%23F0F8FF; font-family: Inter, sans-serif; border-radius: 12px;'%3E%3Ctext x='400' y='50' font-size='24' font-weight='bold' text-anchor='middle' fill='%231f2937'%3EVisualizing the Counselor Deficit%3C/text%3E%3Cg transform='translate(0, 30)'%3E%3C!-- Bar for Global Standard --%3E%3Crect x='200' y='210' width='120' height='50' fill='%234ade80' rx='6'%3E%3C/rect%3E%3Ctext x='260' y='285' text-anchor='middle' font-size='16' font-weight='600' fill='%23333'%3EGlobal Standard%3C/text%3E%3Ctext x='260' y='305' text-anchor='middle' font-size='14' fill='%23555'%3E1:250%3C/text%3E%3C!-- Bar for Indian Reality --%3E%3Crect x='480' y='60' width='120' height='200' fill='%233BB0FF' rx='6'%3E%3C/rect%3E%3Ctext x='540' y='285' text-anchor='middle' font-size='16' font-weight='600' fill='%23333'%3EIndian Reality%3C/text%3E%3Ctext x='540' y='305' text-anchor='middle' font-size='14' fill='%23555'%3E1:3,000%3C/text%3E%3C/g%3E%3C/svg%3E" 
              alt="Chart showing the vast difference between the Global Standard counselor ratio (1:250) and the Indian Reality (1:3,000)" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="text-center md:text-left">
              <span className="inline-block p-4 bg-primary-blue-light rounded-xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </span>
              <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              <p className="mt-4 text-base text-gray-600">
                To empower individuals to make informed career choices by providing personalized guidance, skill development, and mentorship. We aim to bridge the gap between education and industry, ensuring every student and professional gains the confidence, clarity, and resources needed to achieve their career aspirations.
              </p>
            </div>
            <div className="text-center md:text-left">
              <span className="inline-block p-4 bg-primary-blue-light rounded-xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9" />
                </svg>
              </span>
              <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
              <p className="mt-4 text-base text-gray-600">
                To create an intelligent career ecosystem that acts as a lifelong Personalised AI 'JurniQ AI' counsellor—guiding students, graduates, and professionals at every stage of their journey. Our vision is to offer real-time, personalized, and adaptive support that evolves with each individual's skills, interests, and life goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 bg-primary-blue-lighter p-8 md:p-12 rounded-2xl">
            <div className="md:w-1/3 text-center flex-shrink-0">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fsuraj.jpeg?alt=media&token=5393f3c2-d13a-4dbe-bcd2-ec2adc15f3d4" 
                alt="Founder Suraj Kumar" 
                className="rounded-full w-48 h-48 md:w-60 md:h-60 mx-auto border-4 border-white shadow-lg object-cover"
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/240x240/3BB0FF/FFFFFF?text=Founder'; }}
              />
              <h3 className="text-2xl font-bold text-gray-900 mt-4">Suraj Kumar</h3>
              <p className="text-primary-blue font-semibold text-base">Founder, Jurniq Career Guidance</p>
            </div>
            <div className="md:w-2/3 md:pl-8">
              <h4 className="text-3xl font-bold text-gray-900 mb-4">A Message From Our Founder</h4>
              <p className="text-lg text-gray-700 italic leading-relaxed relative pl-8">
                <span className="absolute left-0 top-0 text-6xl text-primary-blue opacity-50 font-serif">"</span>
                Having witnessed the anxiety millions of students and parents face, I founded Jurniq to democratize career guidance. We believe every student deserves a clear roadmap to a fulfilling future, and we're leveraging Personalised AI 'JurniQ AI' to make that a reality. Our true value is delivering clarity, confidence, and a tangible path to success for every family.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900">Our Unique Approach: A Tripartite Ecosystem</h2>
            <p className="text-gray-600 mt-2 text-base max-w-3xl mx-auto">
              We are the first platform to integrate students, parents, and teachers into one cohesive ecosystem, creating a holistic career development OS for the entire school community.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md text-center border-t-4 border-primary-blue hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">For Students</h3>
              <p className="text-gray-600 text-base">Combating confusion with Personalised AI 'JurniQ AI' powered career suggestions, interactive self-discovery quizzes, and modules on entrepreneurship to broaden horizons beyond traditional paths.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md text-center border-t-4 border-primary-blue hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">For Parents</h3>
              <p className="text-gray-600 text-base">Transforming parents into informed guides with data-driven insights and a groundbreaking searchable database of college fees for transparent financial planning.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md text-center border-t-4 border-primary-blue hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">For Teachers</h3>
              <p className="text-gray-600 text-base">Empowering educators with Personalised AI 'JurniQ AI' driven insights into each student's learning style, allowing them to personalize teaching and integrate our platform into their daily workflow.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Our Roadmap: Building Tomorrow's Careers</h2>
            <p className="text-gray-600 mt-2 text-base">Our vision extends far beyond today, with a clear plan for technological and brand leadership.</p>
          </div>
          <div className="relative max-w-2xl mx-auto timeline">
            <div className="mb-12 pl-12 relative timeline-dot">
              <span className="bg-primary-blue text-white text-sm font-semibold mr-2 px-3 py-1 rounded-full absolute -top-1 left-12">2-Year Goal</span>
              <h3 className="text-2xl font-bold text-gray-900 pt-8">The "jurniq-Mentor"</h3>
              <p className="text-gray-600 mt-2 text-base">
                We are developing a proprietary virtual Personalised AI 'JurniQ AI' mentor to serve as an all-encompassing knowledge resource. This marks a pivotal transition from diagnostic AI to generative, interactive AI that provides continuous, conversational guidance 24/7, making expert advice universally accessible.
              </p>
            </div>
            <div className="mb-8 pl-12 relative timeline-dot">
              <span className="bg-primary-blue text-white text-sm font-semibold mr-2 px-3 py-1 rounded-full absolute -top-1 left-12">3-Year Goal</span>
              <h3 className="text-2xl font-bold text-gray-900 pt-8">The "Future Scholars" Initiative</h3>
              <p className="text-gray-600 mt-2 text-base">
                We will launch a scholarship program providing full college funding to our platform's top student performers. This acts as the ultimate proof point for our Personalised AI 'JurniQ AI' Mentor's effectiveness while fulfilling our commitment to social responsibility and nurturing India's future leaders.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AboutUs;
