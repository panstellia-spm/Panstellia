import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Check, X, Star, AlertTriangle, Pin, Bookmark, Archive, RefreshCcw } from 'lucide-react';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected, spam

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setReviews(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading reviews:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isSpam = (text) => {
    if (!text) return false;
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const spamKeywords = ['cheap', 'buy now', 'click here', 'discount', 'free money', 'whatsapp', 'viagra', 'earn cash'];
    
    if (urlPattern.test(text)) return true;
    if (emailPattern.test(text)) return true;
    
    const lowerText = text.toLowerCase();
    return spamKeywords.some(keyword => lowerText.includes(keyword));
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'reviews', id), {
        status: newStatus
      });
      toast.success(`Review ${newStatus} successfully`);
    } catch (err) {
      console.error("Failed to update review status:", err);
      toast.error("Error updating review status");
    }
  };

  const handleToggleFlag = async (id, field, currentValue) => {
    try {
      await updateDoc(doc(db, 'reviews', id), {
        [field]: !currentValue
      });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} status toggled`);
    } catch (err) {
      console.error(`Failed to toggle review field ${field}:`, err);
    }
  };

  const handleBulkAction = async (actionType) => {
    const pendings = reviews.filter(r => r.status === 'pending');
    if (pendings.length === 0) {
      toast.info("No pending reviews found for bulk action");
      return;
    }

    try {
      const batch = writeBatch(db);
      pendings.forEach(r => {
        const ref = doc(db, 'reviews', r.id);
        batch.update(ref, { status: actionType });
      });
      await batch.commit();
      toast.success(`Bulk ${actionType} completed for ${pendings.length} reviews`);
    } catch (err) {
      console.error("Bulk action failed:", err);
      toast.error("Bulk operation failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const processedReviews = reviews.map(r => ({
    ...r,
    potentialSpam: isSpam(r.text)
  }));

  const filteredReviews = processedReviews.filter(r => {
    if (filterStatus === 'all') return !r.archived;
    if (filterStatus === 'pending') return r.status === 'pending' && !r.archived;
    if (filterStatus === 'approved') return r.status === 'approved' && !r.archived;
    if (filterStatus === 'rejected') return r.status === 'rejected' && !r.archived;
    if (filterStatus === 'spam') return r.potentialSpam && !r.archived;
    if (filterStatus === 'archived') return r.archived;
    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-luxury-900">Review Moderation Queue</h1>
          <p className="text-sm text-luxury-500 mt-1">Approve, reject, pin, or feature customer testimonials. Spams are automatically flagged.</p>
        </div>
        
        {/* Bulk buttons */}
        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => handleBulkAction('approved')}
            className="px-4 py-2 border border-emerald-500 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Approve All Pendings
          </button>
          <button
            onClick={() => handleBulkAction('rejected')}
            className="px-4 py-2 border border-red-500 bg-red-50 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Reject All Pendings
          </button>
        </div>
      </div>

      {/* Filter Status Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All Reviews' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'spam', label: 'Potential Spam ⚠️' },
          { key: 'archived', label: 'Archived / Soft-Deleted' }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 border rounded-full text-xs font-semibold transition-all duration-150 ${
              filterStatus === f.key
                ? 'bg-gold-500 text-white border-gold-500 shadow-sm'
                : 'bg-white text-luxury-700 border-luxury-200 hover:border-gold-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                <th className="py-3 px-4 w-28">Customer</th>
                <th className="py-3 px-4 w-24">Rating</th>
                <th className="py-3 px-4">Review Content</th>
                <th className="py-3 px-4 w-32">Attributes</th>
                <th className="py-3 px-4 w-24">Status</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100 text-sm">
              {filteredReviews.map((rev) => (
                <tr key={rev.id} className={`hover:bg-luxury-50/20 ${rev.potentialSpam && rev.status === 'pending' ? 'bg-amber-50/40' : ''}`}>
                  {/* Customer name & role */}
                  <td className="py-4 px-4 font-medium text-luxury-900 align-top">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{rev.avatar || '✨'}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate max-w-[120px] uppercase">{rev.name || 'Anonymous'}</div>
                        <div className="text-[10px] text-luxury-400 truncate max-w-[120px] mt-0.5">{rev.role || 'Verified Buyer'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Rating Stars */}
                  <td className="py-4 px-4 align-top">
                    <div className="flex gap-0.5 text-gold-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < (rev.rating || 0) ? 'fill-gold-500' : 'text-luxury-200'}`} />
                      ))}
                    </div>
                    {rev.createdAt && (
                      <span className="text-[10px] text-luxury-400 block mt-1">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </td>

                  {/* Review Text */}
                  <td className="py-4 px-4 align-top">
                    <p className="text-luxury-800 leading-relaxed text-xs break-words max-w-md">{rev.text}</p>
                    
                    {/* Spam Warn Chip */}
                    {rev.potentialSpam && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 border border-amber-200 rounded text-[9px] font-bold text-amber-800 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        Potential Spam Filter Flagged
                      </div>
                    )}
                  </td>

                  {/* Badges / Attributes */}
                  <td className="py-4 px-4 align-top space-y-1">
                    {/* Pin/Feature badges */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleToggleFlag(rev.id, 'pinned', rev.pinned)}
                        className={`p-1 rounded border flex items-center justify-center transition-colors ${
                          rev.pinned 
                            ? 'bg-gold-50 border-gold-300 text-gold-700' 
                            : 'border-luxury-200 text-luxury-400 hover:border-gold-400'
                        }`}
                        title={rev.pinned ? "Unpin review" : "Pin review to top"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleFlag(rev.id, 'featured', rev.featured)}
                        className={`p-1 rounded border flex items-center justify-center transition-colors ${
                          rev.featured 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                            : 'border-luxury-200 text-luxury-400 hover:border-indigo-400'
                        }`}
                        title={rev.featured ? "Remove from Homepage Testimonials" : "Feature on Homepage Carousel"}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-luxury-400">
                      {rev.pinned && <div>• Pinned</div>}
                      {rev.featured && <div>• Featured on Home</div>}
                    </div>
                  </td>

                  {/* Status badge */}
                  <td className="py-4 px-4 align-top">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                      rev.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      rev.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rev.status || 'pending'}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-4 px-4 text-right align-top">
                    <div className="flex items-center justify-end gap-1.5">
                      {rev.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, 'approved')}
                          className="p-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {rev.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                          className="p-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleFlag(rev.id, 'archived', rev.archived)}
                        className={`p-1 rounded-lg border ${
                          rev.archived
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            : 'border-luxury-200 text-luxury-400 hover:bg-red-50 hover:text-red-700 hover:border-red-250'
                        }`}
                        title={rev.archived ? "Restore Review" : "Soft-Delete (Archive)"}
                      >
                        {rev.archived ? <RefreshCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-luxury-400">
                    No reviews in this queue filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
