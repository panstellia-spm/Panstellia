import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Star, Award, Crown, ArrowRight } from 'lucide-react';
import SEOHelmet from '../utils/seoHelmet';

const AboutUsPage = () => {
  const brandValues = [
    {
      icon: Crown,
      title: 'Honest and Transparent',
      desc: 'Clear pricing, genuine materials, and a buying experience built on trust.'
    },
    {
      icon: Sparkles,
      title: 'Modern Elegance',
      desc: 'Lightweight, versatile designs that feel effortless and stunning at every occasion.'
    },
    {
      icon: Award,
      title: 'Easy, Secure Checkout',
      desc: 'Fast, reliable checkout so you can complete your order with confidence and peace of mind.'
    }
  ];

  const testimonials = [
    { text: 'Panstellia made my wedding magical!', author: 'Priya R.', rating: 5 },
    { text: 'Heirloom quality, fast delivery.', author: 'Rahul K.', rating: 5 },
    { text: 'Exceeded expectations completely.', author: 'Anita S.', rating: 5 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-luxury-50 text-luxury-900">
      <SEOHelmet
        title="About Panstellia | Modern Luxury Jewelry for Every Moment"
        description="Discover Panstellia’s story, craftsmanship, and secure shopping experience for jewelry designed to be cherished and worn proudly."
        keywords="about jewelry, luxury jewelry, handcrafted necklaces, secure checkout, modern jewelry"
        canonical="https://panstellia.com/about-us"
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://i.ibb.co/B5Ws7Gfk/AI-Generated-Image-2026-06-23.jpg')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-950/40 via-luxury-900/20 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_35%)] pointer-events-none"></div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-24 flex flex-col justify-center min-h-[62vh]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs tracking-[0.2em] uppercase text-white/90">
              Crafted for modern moments
            </span>
            <h1 className="mt-6 font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white">
              Jewelry that feels <span className="text-gold-300">luxurious</span>, effortless, and unmistakably you.
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/85">
              Panstellia designs jewelry to celebrate every story—crafted with premium materials, modern thinking, and a promise of lasting beauty.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/products"
                className="btn-primary px-6 py-3 text-base inline-flex items-center justify-center"
              >
                Explore Collection <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.section initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <motion.div className="space-y-6" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Our story
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              Luxury jewelry designed for today’s moments.
            </h2>
            <p className="text-luxury-600 leading-relaxed max-w-2xl">
              Panstellia brings a fresh take to jewelry with thoughtful designs, exceptional materials, and a modern luxury experience that feels effortless from first glance to first wear.
            </p>
            <p className="text-luxury-600 leading-relaxed max-w-2xl">
              Every collection is created to be versatile, beautifully crafted, and built to become part of your story—whether it’s a gift, a celebration, or everyday elegance.
            </p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }} className="overflow-hidden rounded-[2rem] shadow-2xl">
            <img
              src="https://i.ibb.co/tw43vBRN/Chat-GPT-Image-May-23-2026-10-01-25-AM.png"
              alt="Luxury jewelry image"
              loading="lazy"
              className="w-full h-full min-h-[420px] object-cover"
            />
          </motion.div>
        </div>
      </motion.section>

      <section className="py-16 bg-luxury-50">
        <div className="max-w-6xl mx-auto px-4 grid gap-10 lg:grid-cols-2 items-start">
          <div className="space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Our vision
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              A brand that makes luxury feel personal.
            </h2>
            <p className="text-luxury-600 leading-relaxed max-w-2xl">
              We believe jewelry should be accessible, beautiful, and meaningful—crafted with care so it can be worn confidently every day.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="https://i.ibb.co/MFCffjn/Chat-GPT-Image-May-19-2026-12-16-30-PM.png"
              alt="Close-up of elegant jewelry details"
              loading="lazy"
              className="w-full h-full min-h-[420px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
            Our values
          </span>
          <h2 className="mt-6 text-4xl md:text-5xl font-serif font-bold text-luxury-900">
            What makes Panstellia different.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {brandValues.map((value, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: idx * 0.1 }} className="rounded-3xl bg-white p-8 shadow-xl border border-luxury-100 hover:-translate-y-1 hover:shadow-2xl transition-transform duration-300">
                <div className="w-14 h-14 bg-gold-100 text-gold-700 rounded-3xl flex items-center justify-center mb-6">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-luxury-900">{value.title}</h3>
                <p className="mt-4 text-luxury-600 leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-gold-600 to-gold-700 text-white">
        <div className="max-w-6xl mx-auto px-4 rounded-3xl p-10 sm:p-12 grid gap-6 sm:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/80 mb-3">Why Panstellia</p>
            <h2 className="text-3xl md:text-4xl font-bold">Jewelry made for real life and remarkable moments.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/90">
              From polished necklaces to statement earrings, our collections are created to look beautiful, feel effortless, and give you the confidence to shine.
            </p>
          </div>
          <Link to="/products" className="btn-primary px-8 py-4 text-base inline-flex items-center justify-center shadow-2xl">
            Shop Collection <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Customer love
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              Trusted by customers for beauty and care.
            </h2>
            <p className="text-luxury-600 leading-relaxed max-w-2xl">
              Every piece is designed to feel luxurious and easy to wear, backed by careful service so your shopping experience is as delightful as the jewelry itself.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {testimonials.map((testimonial, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: idx * 0.1 }} whileHover={{ y: -6 }} className="rounded-3xl bg-white p-8 shadow-xl border border-luxury-100 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-gold-500 fill-current" />
                  ))}
                </div>
                <p className="text-luxury-700 italic leading-relaxed">“{testimonial.text}”</p>
                <p className="mt-5 font-semibold text-luxury-900">— {testimonial.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;

