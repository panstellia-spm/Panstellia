import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Star, Award, Crown, ArrowRight } from 'lucide-react';
import SEOHelmet from '../utils/seoHelmet';

const AboutUsPage = () => {
  const journeyItems = [
    { year: '2024', title: 'Founded', desc: 'TamilNadu family tradition', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&fit=crop&amp;crop=entropy' },
    { year: '2024', title: 'First Collection', desc: 'Inspired by Korean markets', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&fit=crop&amp;crop=entropy' },
    { year: '2025', title: 'E-commerce Launch', desc: 'Global reach with local roots', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&fit=crop&amp;crop=entropy' }
  ];

  const teamMembers = [
    { name: 'Cimoen Moses', role: 'Founder & MD', specialty: 'Curated Selection', img: 'https://i.ibb.co/Ldr9v8Mv/CM.png' },
  ];

  const craftSteps = [
    { icon: Crown, title: 'Design', desc: 'Traditional-modern fusion' },
    { icon: Star, title: 'Gem Sourcing', desc: 'Ethical collections' },
    { icon: Sparkles, title: 'Handcrafting', desc: 'Artisan precision' },
    { icon: Award, title: 'Quality Certified', desc: 'Longtime guarantee' }
  ];

  const testimonials = [
    { text: 'Panstellia made my wedding magical!', author: 'Priya R.', rating: 5 },
    { text: 'Heirloom quality, fast delivery.', author: 'Rahul K.', rating: 5 },
    { text: 'Exceeded expectations completely.', author: 'Anita S.', rating: 5 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-luxury-50 text-luxury-900">
      <SEOHelmet 
        title="About Panstellia | Luxury Jewelry Heritage Since 2024"
        description="Learn about Panstellia's journey in luxury jewelry. Traditional craftsmanship meets modern design. Explore our heritage, team, and commitment to quality."
        keywords="about jewelry, luxury brand, jewelry craftsmanship, heirloom jewelry, handmade necklaces"
        canonical="https://panstellia.com/about-us"
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&w=1920&fit=crop')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-950/80 via-luxury-900/30 to-transparent"></div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-24 flex flex-col justify-center min-h-[62vh]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs tracking-[0.2em] uppercase text-white/90">
              Since 2024 • Korean Heritage
            </span>
            <h1 className="mt-6 font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white">
              Jewelry with <span className="text-gold-300">heritage</span> and modern soul.
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/85">
              Panstellia blends traditional craftsmanship with contemporary luxury, creating pieces that feel timeless today and treasured for generations.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to="/products" 
                className="btn-primary px-6 py-3 text-base inline-flex items-center justify-center"
              >
                Explore Collection <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                to="/" 
                className="btn-secondary px-6 py-3 text-base inline-flex items-center justify-center"
              >
                Discover More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Our journey of craft
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              A heritage brand born from tradition and thoughtful design.
            </h2>
            <p className="text-luxury-600 leading-relaxed max-w-2xl">
              From an artisan family in Tamil Nadu to a globally loved label, Panstellia creates jewelry with soul, attention to detail, and a commitment to ethical sourcing.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {journeyItems.map((item, idx) => (
              <div key={idx} className="rounded-3xl bg-white shadow-xl border border-luxury-100 overflow-hidden">
                <img src={item.img} alt={item.title} loading="lazy" className="w-full h-52 object-cover" />
                <div className="p-6">
                  <div className="text-gold-600 font-semibold text-lg">{item.year}</div>
                  <h3 className="mt-2 font-serif text-2xl font-bold text-luxury-900">{item.title}</h3>
                  <p className="mt-3 text-luxury-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-luxury-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Crafted to last
            </span>
            <h2 className="mt-6 text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              Our craftsmanship promise.
            </h2>
            <p className="mt-5 text-luxury-600 leading-relaxed">
              Every piece is carefully designed, sourced, and finished by skilled artisans to ensure a luxurious look, lasting beauty, and fine detail in every shine.
            </p>
          </div>

          <div className="mt-12 grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {craftSteps.map((step, idx) => (
              <div key={idx} className="rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-r from-gold-500 to-gold-600 rounded-3xl flex items-center justify-center mb-6">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-luxury-900 mb-3">{step.title}</h3>
                <p className="text-luxury-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-xs uppercase tracking-[0.2em]">
              Meet the founder
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury-900">
              Built by a family, shaped by artisans.
            </h2>
            <p className="text-luxury-600 leading-relaxed max-w-xl">
              Cimoen Moses leads Panstellia with a passion for authentic beauty, delivering heirloom-quality jewelry that honors heritage while feeling distinctly modern.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="rounded-3xl overflow-hidden shadow-xl border border-luxury-100">
              <img src={teamMembers[0].img} alt={teamMembers[0].name} loading="lazy" className="w-full h-72 object-cover" />
              <div className="p-8 bg-white">
                <h3 className="text-2xl font-bold text-luxury-900">{teamMembers[0].name}</h3>
                <p className="mt-2 text-gold-600 font-medium">{teamMembers[0].role}</p>
                <p className="mt-4 text-luxury-600 leading-relaxed">{teamMembers[0].specialty}</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {testimonials.map((testimonial, idx) => (
                <div key={idx} className="rounded-3xl bg-white p-6 shadow-xl border border-luxury-100">
                  <div className="flex items-center gap-2 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-gold-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-luxury-700 italic leading-relaxed">“{testimonial.text}”</p>
                  <p className="mt-5 font-semibold text-luxury-900">— {testimonial.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-gold-600 to-gold-700 text-white">
        <div className="max-w-6xl mx-auto px-4 rounded-3xl p-10 sm:p-12 grid gap-6 sm:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/80 mb-3">Limited edition elegance</p>
            <h2 className="text-3xl md:text-4xl font-bold">Find your signature piece today.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/90">
              Discover handcrafted jewelry made for celebrations, milestones, and everyday luxury.
            </p>
          </div>
          <Link to="/products" className="btn-primary px-8 py-4 text-base inline-flex items-center justify-center shadow-2xl">
            Shop Now <Crown className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;

