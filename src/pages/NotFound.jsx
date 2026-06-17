import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full text-center bg-white p-12 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gray-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gray-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
        
        <div className="relative z-10">
          <h1 className="text-[9rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-400 mb-2 tracking-tighter">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">
            Page Not Found
          </h2>
          <p className="text-gray-500 mb-10 leading-relaxed text-lg px-4">
            Oops! The page you are looking for doesn't exist or has been moved to another universe.
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-medium text-white transition-all duration-300 bg-gray-900 rounded-full hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
