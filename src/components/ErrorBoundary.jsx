import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a chunk load error or dynamic import failure
      const isChunkLoadError = this.state.error?.name === 'ChunkLoadError' || 
                               this.state.error?.message?.includes('Failed to fetch dynamically imported module');
      
      const title = isChunkLoadError ? "Update Available" : "Oops! Something went wrong";
      const message = isChunkLoadError 
        ? "A new version of the application is available. Please click below to refresh and continue." 
        : "We're sorry, but something went wrong on our end. Please try going back to the home page.";

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] px-6 py-12">
          <div className="max-w-lg w-full text-center bg-white p-12 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gray-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
            
            <div className="relative z-10">
              <h1 className="text-[7rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-400 mb-4 tracking-tighter">
                {isChunkLoadError ? "Oops" : "Error"}
              </h1>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif">
                {title}
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed text-base px-2">
                {message}
              </p>
              
              <button
                onClick={() => {
                  // For chunk load errors, a full reload is necessary to fetch the new JS chunks
                  window.location.href = '/';
                }}
                className="inline-flex items-center justify-center px-10 py-4 text-base font-medium text-white transition-all duration-300 bg-gray-900 rounded-full hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              >
                Go Home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-10 text-left bg-gray-50 p-5 rounded-2xl text-sm overflow-auto max-h-48 border border-gray-100 relative z-10">
                <summary className="cursor-pointer font-semibold mb-3 text-gray-700 outline-none">Developer Details</summary>
                <div className="text-red-500 font-mono text-xs mb-3 font-semibold">{this.state.error && this.state.error.toString()}</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-600 font-mono bg-white p-3 rounded-lg border border-gray-100">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

