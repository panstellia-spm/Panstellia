import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Star, Award, Crown, ArrowRight } from 'lucide-react';
import SEOHelmet from '../utils/seoHelmet';
import { getWebPageSchema } from '../utils/structuredData';

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
    { text: 'Panstellia made my wedding magical!', author: 'Priya R.', rating: 3 },
    { text: 'Heirloom quality, fast delivery.', author: 'Rahul K.', rating: 5 },
    { text: 'Exceeded expectations completely.', author: 'Anita S.', rating: 4 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-luxury-50 text-luxury-900">
      <SEOHelmet
        title="About Us | Panstellia — Modern Luxury Jewelry"
        description="Learn about Panstellia's story, founder Cimeon Moses, and our craftsmanship. Luxury jewelry designed for every moment, backed by honesty and modern elegance."
        keywords="about Panstellia, luxury jewelry brand, Cimeon Moses, jewelry story, handcrafted necklaces"
        canonical="https://panstellia.com/about-us"
        structuredData={getWebPageSchema({
          name: 'About Us — Panstellia',
          description: 'Learn about Panstellia’s story, founder Cimeon Moses, and our craftsmanship. Luxury jewelry designed for every moment.',
          url: 'https://panstellia.com/about-us',
          breadcrumbName: 'About Us'
        })}
      />

      <section className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/omoikkzf/image/upload/v1782812152/db8ee875-de62-4ed5-bafc-c093f8c386c1_cp2nbv.png')] bg-cover bg-center"></div>

        {/* Left-side dark overlay — 40% opacity, fades to transparent at 55% width */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.38) 30%, rgba(0,0,0,0.10) 50%, transparent 55%)'
          }}
        ></div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-24 flex flex-col justify-center min-h-[62vh]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs tracking-[0.2em] uppercase text-white/90">
              Crafted for modern moments
            </span>
            {/* Main heading — #F8F4EE, highlight word — #D4AF37 */}
            <h1
              className="mt-6 font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
              style={{ color: '#F8F4EE' }}
            >
              Jewelry that feels{' '}
              <span style={{ color: '#D4AF37' }}>luxurious</span>,{' '}
              effortless, and unmistakably you.
            </h1>
            {/* Paragraph — #E8DDD0 */}
            <p
              className="mt-6 max-w-2xl text-base sm:text-lg leading-8 font-light"
              style={{ color: '#E8DDD0' }}
            >
              Panstellia designs jewelry to celebrate every story—crafted with premium materials, modern thinking, and a promise of lasting beauty.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              {/* CTA — #C88A2A bg, #B8791E on hover */}
              <Link
                to="/products"
                className="px-6 py-3 text-base inline-flex items-center justify-center rounded-full font-semibold text-white transition-colors duration-200"
                style={{ backgroundColor: '#C88A2A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B8791E'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C88A2A'}
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
            <p className="text-luxury-600 leading-relaxed max-w-2xl font-light">
              Panstellia brings a fresh take to jewelry with thoughtful designs, exceptional materials, and a modern luxury experience that feels effortless from first glance to first wear.
            </p>
            <p className="text-luxury-600 leading-relaxed max-w-2xl font-light">
              Every collection is created to be versatile, beautifully crafted, and built to become part of your story—whether it’s a gift, a celebration, or everyday elegance.
            </p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }} className="overflow-hidden rounded-[2rem] shadow-2xl h-full">
            <img
              src="https://i.ibb.co/tw43vBRN/Chat-GPT-Image-May-23-2026-10-01-25-AM.png"
              alt="Luxury jewelry image"
              loading="lazy"
              className="w-full h-full min-h-[420px] object-cover"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ── Founder Section ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              The Visionary
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              Meet the Founder &amp; MD
            </h2>
          </motion.div>

          {/* Founder card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-luxury-100"
            style={{
              background: 'linear-gradient(135deg, #fdf8f0 0%, #fff9f0 40%, #fef6e4 100%)'
            }}
          >
            {/* Decorative gold arc top-right */}
            <div
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none opacity-10"
              style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
            />
            {/* Decorative gold arc bottom-left */}
            <div
              className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full pointer-events-none opacity-10"
              style={{ background: 'radial-gradient(circle, #C88A2A 0%, transparent 70%)' }}
            />

            <div className="relative grid lg:grid-cols-[auto_1fr] gap-10 items-center p-10 sm:p-14">
              {/* Avatar column */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
                className="flex flex-col items-center gap-4 lg:min-w-[220px]"
              >
                {/* Gold-ringed initials avatar */}
                <div
                  className="w-36 h-36 rounded-full flex items-center justify-center shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #C88A2A 100%)',
                    boxShadow: '0 0 0 5px #fff, 0 0 0 8px #D4AF37, 0 16px 48px rgba(212,175,55,0.30)'
                  }}
                >
                  <span className="font-serif text-4xl font-bold text-white tracking-wide select-none">
                    CM
                  </span>
                </div>

                {/* Name */}
                <div className="text-center">
                  <p className="font-serif text-2xl font-bold text-luxury-900 tracking-wide">
                    Cimeon Moses
                  </p>
                  {/* Title badge */}
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.18em] text-white"
                    style={{ background: 'linear-gradient(90deg, #C88A2A, #D4AF37)' }}
                  >
                    <Crown className="w-3 h-3" />
                    Founder &amp; MD
                  </span>
                </div>
              </motion.div>

              {/* Content column */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.85, delay: 0.2, ease: 'easeOut' }}
                className="space-y-6"
              >
                {/* Pull quote */}
                <blockquote className="relative">
                  <span
                    className="absolute -top-4 -left-2 text-7xl leading-none font-serif select-none"
                    style={{ color: '#D4AF37', opacity: 0.35 }}
                  >"</span>
                  <p
                    className="pl-6 text-xl sm:text-2xl font-serif italic font-light leading-relaxed text-luxury-800"
                  >
                    Jewelry is not just an accessory—it is a language. At Panstellia, every piece speaks of elegance, identity, and the moments that matter most.
                  </p>
                </blockquote>

                {/* Divider */}
                <div
                  className="w-16 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #D4AF37, #C88A2A)' }}
                />

                {/* Bio paragraphs */}
                <p className="text-luxury-600 leading-relaxed font-light">
                  Cimeon Moses founded Panstellia with a singular belief: that truly beautiful jewelry should be within reach of everyone who appreciates artistry and meaning. With a vision rooted in modern luxury and timeless craftsmanship, he built Panstellia from the ground up—guided by integrity, creativity, and a deep respect for the customers it serves.
                </p>
                <p className="text-luxury-600 leading-relaxed font-light">
                  As Managing Director, Cimeon oversees every aspect of the brand—from design philosophy and material sourcing to customer experience—ensuring that each Panstellia piece carries the same promise: exceptional quality, honest pricing, and enduring beauty.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-luxury-50">
        <div className="max-w-6xl mx-auto px-4 grid gap-10 lg:grid-cols-2 items-start">
          <div className="space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Our vision
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              A brand that makes luxury feel personal.
            </h2>
            <p className="text-luxury-600 leading-relaxed max-w-2xl font-light">
              We believe jewelry should be accessible, beautiful, and meaningful—crafted with care so it can be worn confidently every day.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl h-full">
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
                <p className="mt-4 text-luxury-600 leading-relaxed font-light">{value.desc}</p>
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
            <p className="mt-4 max-w-2xl leading-relaxed font-light text-white/90">
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
            <p className="text-luxury-600 leading-relaxed max-w-2xl font-light">
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
                <p className="text-luxury-700 italic leading-relaxed font-light">“{testimonial.text}”</p>
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

