import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Star, Users, Award, Crown, Leaf, Clock, Heart, ArrowRight, ChevronLeft, ChevronRight, Quote, Play } from 'lucide-react';

const AboutUsPage = () => {
  const journeyItems = [
    { year: '2024', title: 'Founded', desc: 'TamilNadu family tradition', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&fit=crop&amp;crop=entropy' },
    { year: '2024', title: 'First Collection', desc: 'Inspired by Jaipur markets', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&fit=crop&amp;crop=entropy' },
    { year: '2025', title: 'E-commerce Launch', desc: 'Global reach with local roots', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&fit=crop&amp;crop=entropy' }
  ];

  const teamMembers = [
    { name: 'Cimoen Moses', role: 'Founder & MD', specialty: 'Gold Filigree', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&amp;h=300&amp;fit=crop&amp;crop=face&amp;loading=lazy' },
  ];

  const craftSteps = [
    { icon: Crown, title: 'Design', desc: 'Traditional-modern fusion' },
    { icon: Star, title: 'Gem Sourcing', desc: 'Ethical 22K gold' },
    { icon: Sparkles, title: 'Handcrafting', desc: 'Artisan precision' },
    { icon: Award, title: 'Quality Certified', desc: 'Lifetime guarantee' }
  ];

  const testimonials = [
    { text: 'Panstellia made my wedding magical!', author: 'Priya R.', rating: 5 },
    { text: 'Heirloom quality, fast delivery.', author: 'Rahul K.', rating: 5 },
    { text: 'Exceeded expectations completely.', author: 'Anita S.', rating: 5 }
  ];

  const [currentSlide, setCurrentSlide] = React.useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-luxury-50">
      {/* Compact Hero */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center bg-gradient-to-br from-luxury-900 to-gold-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&amp;w=1920&amp;fit=crop')] bg-cover bg-center opacity-50"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-white text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <span className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm mb-6">Since 2024 • Chinese Heritage</span>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
              Heritage <span className="text-gold-300 block">Redefined</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-lg leading-relaxed">Timeless jewelry from ancient markets to modern lifestyles.</p>
            <Link to="/products" className="btn-primary px-8 py-4 text-lg inline-flex items-center">
              Explore Collections <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Journey & Team Carousel */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="text-center font-serif text-4xl md:text-5xl font-bold text-luxury-900 mb-16">Our Story & Masters</motion.h2>
          <div className="relative overflow-hidden rounded-3xl bg-luxury-50/50 backdrop-blur p-8 md:p-12">
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {journeyItems.map((item, idx) => (
                <div key={idx} className="w-full md:w-1/3 flex-shrink-0 px-4">
                  <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all p-8 text-center h-[500px] flex flex-col">
                    <img src={item.img} alt={item.title} loading="lazy" className="w-full h-64 object-cover rounded-xl mb-6" />
                    <div className="font-bold text-2xl text-gold-600 mb-2">{item.year}</div>
                    <h4 className="font-serif text-2xl font-bold mb-3">{item.title}</h4>
                    <p className="text-luxury-600 mb-6 flex-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : journeyItems.length - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentSlide((prev) => (prev + 1) % journeyItems.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          {/* Team below carousel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {teamMembers.map((member, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="group">
                <img src={member.img} alt={member.name} loading="lazy" className="w-full h-64 object-cover rounded-2xl group-hover:scale-105 transition-transform" />
                <h4 className="font-serif text-xl font-bold mt-4">{member.name}</h4>
                <p className="text-gold-600 font-medium">{member.role}</p>
                <p className="text-luxury-600">{member.specialty}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Craft Steps */}
      <section className="py-20 bg-luxury-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="text-center font-serif text-4xl md:text-5xl font-bold text-luxury-900 mb-16">Craftsmanship Promise</motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {craftSteps.map((step, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all">
                <div className="w-20 h-20 bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <h4 className="font-bold text-xl mb-4">{step.title}</h4>
                <p className="text-luxury-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials + CTA */}
      <section className="py-20 bg-gradient-to-b from-white to-luxury-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-8 h-8 text-gold-500 fill-current mx-1" />)}
            </div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-luxury-900 mb-4">Loved Worldwide</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {testimonials.map((testimonial, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center border">
                <div className="flex justify-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-6 h-6 text-gold-500 fill-current" />)}
                </div>
                <blockquote className="text-xl italic font-serif mb-6">"{testimonial.text}"</blockquote>
                <cite className="font-bold text-luxury-700">— {testimonial.author}</cite>
              </motion.div>
            ))}
          </div>
          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="text-center bg-gradient-to-r from-gold-600 to-gold-700 text-white p-12 rounded-3xl">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">Wear Timeless Elegance</h2>
            <Link to="/products" className="btn-primary px-12 py-6 text-xl inline-flex items-center mx-auto shadow-2xl">
              Shop Now <Crown className="w-6 h-6 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;

