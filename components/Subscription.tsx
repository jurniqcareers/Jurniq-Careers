
import React, { useState, useEffect } from 'react';
import { trackEvent } from '../services/analyticsService';
import { User } from '../types';
import { load } from '@cashfreepayments/cashfree-js';
import { API } from '@/services/apiConfig';

interface SubscriptionProps {
  user: User | null;
  onRequireAuth: () => void;
}

const Subscription: React.FC<SubscriptionProps> = ({ user, onRequireAuth }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [cashfree, setCashfree] = useState<any>(null);

  useEffect(() => {
    const initCashfree = async () => {
      const cf = await load({
        mode: "sandbox", // or "production"
      });
      setCashfree(cf);
    };
    initCashfree();
  }, []);

  const handlePlanClick = async (planName: string, price: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    if (price === 'Free') {
        trackEvent('plan_selected', { plan_name: planName, price: price });
        // Handle free plan logic if any
        return;
    }

    setLoading(planName);
    try {
      const response = await fetch(API.createOrder, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(price),
          customerId: user.uid,
          customerPhone: "9999999999", // Should ideally be from user profile
          customerEmail: user.email,
          planName: planName,
        }),
      });

      const orderData = await response.json();

      if (orderData.payment_session_id && cashfree) {
        const checkoutOptions = {
          paymentSessionId: orderData.payment_session_id,
          returnUrl: `${window.location.origin}/subscription?order_id={order_id}`,
        };
        cashfree.checkout(checkoutOptions);
      }
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="bg-gray-50 font-sans text-gray-800">
        {/* Subscription Plans Section */}
        <section className="py-16">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-primary-blue tracking-wide">SUBSCRIPTION PLANS</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Basic Plan */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col transform transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-800">Basic</h2>
                        <p className="text-gray-500 mt-1">A great solution for beginners</p>
                        <p className="text-5xl font-extrabold text-gray-900 my-4">FREE</p>
                        <button 
                            onClick={() => handlePlanClick('Basic', 'Free')} 
                            className="w-full text-center bg-primary-blue text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                        >
                            Access Now
                        </button>
                        <div className="border-t my-6"></div>
                        <p className="font-semibold mb-3">What you get:</p>
                        <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Start Career Path</li>
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Sport Career Path</li>
                        </ul>
                    </div>

                    {/* Student Plan */}
                    <div className="bg-white rounded-2xl border-2 border-primary-blue shadow-xl p-6 flex flex-col transform transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-800">Student</h2>
                        <p className="text-gray-500 mt-1">A great solution for beginners</p>
                        <p className="text-5xl font-extrabold text-gray-900 my-4">₹99<span className="text-lg font-medium text-gray-500">/mo</span></p>
                        <button 
                            onClick={() => handlePlanClick('Student', '99')} 
                            disabled={loading === 'Student'}
                            className="w-full text-center bg-primary-blue text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                        >
                            {loading === 'Student' ? 'Processing...' : 'Choose plan'}
                        </button>
                        <div className="border-t my-6"></div>
                        <p className="font-semibold mb-3">What you get:</p>
                        <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Start Career Path</li>
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Sport Career Path</li>
                             <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Quiz Test</li>
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Study Materials</li>
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Personalized video</li>
                        </ul>
                    </div>

                    {/* Teacher Plan */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col transform transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-800">Teacher</h2>
                        <p className="text-gray-500 mt-1">A great solution for beginners</p>
                        <p className="text-5xl font-extrabold text-gray-900 my-4">₹129<span className="text-lg font-medium text-gray-500">/mo</span></p>
                        <button 
                            onClick={() => handlePlanClick('Teacher', '129')} 
                            disabled={loading === 'Teacher'}
                            className="w-full text-center bg-primary-blue text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                        >
                            {loading === 'Teacher' ? 'Processing...' : 'Choose plan'}
                        </button>
                        <div className="border-t my-6"></div>
                        <p className="font-semibold mb-3">What you get:</p>
                        <ul className="space-y-2 text-gray-600">
                           <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Students Teaching ability material</li>
                           <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>School & College fees</li>
                           <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Personalized Video</li>
                        </ul>
                    </div>

                    {/* Parent Plan */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col transform transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-800">Parent</h2>
                        <p className="text-gray-500 mt-1">A great solution for beginners</p>
                        <p className="text-5xl font-extrabold text-gray-900 my-4">₹149<span className="text-lg font-medium text-gray-500">/mo</span></p>
                        <button 
                            onClick={() => handlePlanClick('Parent', '149')} 
                            disabled={loading === 'Parent'}
                            className="w-full text-center bg-primary-blue text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                        >
                            {loading === 'Parent' ? 'Processing...' : 'Choose plan'}
                        </button>
                        <div className="border-t my-6"></div>
                        <p className="font-semibold mb-3">What you get:</p>
                        <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Children ability Test</li>
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>School & College fees</li>
                            <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Students Category</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        {/* Other Plan Section */}
        <section className="py-16">
            <div className="container mx-auto px-6 text-center">
                 <h2 className="text-3xl font-bold text-gray-800">Other Plan</h2>
                 <div className="mt-8 max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
                     <h3 className="text-2xl font-bold text-gray-800">School & Institute</h3>
                     <p className="mt-4 text-gray-600 max-w-md mx-auto">This is the whole sale subscription in which you can get the student, teacher plan with bulk information on per student.</p>
                     <button onClick={() => handlePlanClick('School/Institute', 'Custom')} className="mt-6 inline-block bg-white text-primary-blue px-8 py-3 rounded-lg font-semibold border-2 border-primary-blue hover:bg-primary-blue-lighter transition-colors">Contact for Details</button>
                 </div>
            </div>
        </section>

        {/* Compare Plans Table */}
        <section className="py-16">
            <div className="container mx-auto px-6">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-800">Compare our plans</h2>
                    <p className="text-gray-600 mt-2">See at a glance what each plan costs and what you get for your money.</p>
                </div>
                <div className="overflow-x-auto rounded-lg shadow-lg">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-bold text-2xl text-gray-900">Top features</th>
                                <th scope="col" className="px-6 py-3 text-center">
                                    <div className="font-bold text-lg">Basic</div>
                                    <div className="text-2xl font-extrabold text-gray-900">FREE</div>
                                    <button onClick={() => handlePlanClick('Basic', 'Free')} className="mt-2 inline-block bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold">Access Now</button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-center">
                                    <div className="font-bold text-lg">Student</div>
                                    <div className="text-2xl font-extrabold text-gray-900">₹99/mo</div>
                                    <button onClick={() => handlePlanClick('Student', '99')} className="mt-2 inline-block bg-primary-blue text-white px-4 py-2 rounded-lg text-xs font-semibold">Choose Plan</button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-center">
                                    <div className="font-bold text-lg">Teacher</div>
                                    <div className="text-2xl font-extrabold text-gray-900">₹129/mo</div>
                                    <button onClick={() => handlePlanClick('Teacher', '129')} className="mt-2 inline-block bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold">Choose Plan</button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-center">
                                    <div className="font-bold text-lg">Parent</div>
                                    <div className="text-2xl font-extrabold text-gray-900">₹149/mo</div>
                                    <button onClick={() => handlePlanClick('Parent', '149')} className="mt-2 inline-block bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold">Choose Plan</button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Self-career path</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-gray-50 border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Quiz test</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-white border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Sport choice category</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-gray-50 border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Business career path</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-white border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Notes and videos</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-gray-50 border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">School and College fee details</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-white border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Children ability test</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td></tr>
                            <tr className="bg-gray-50 border-b"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Based on to teacher can test the student on the subject</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td></tr>
                            <tr className="bg-white"><th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">Personalized Teacher notes upload and download</th><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></td><td className="px-6 py-4 text-center"><svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    </main>
  );
};

export default Subscription;

