import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Briefcase, MapPin, Sparkles, Navigation } from 'lucide-react';
import SeoHelmet from '../utils/seoHelmet';
import { getWebPageSchema } from '../utils/structuredData';

const Careers = () => {
  const handleApply = (e, subject) => {
    e.preventDefault();
    const email = 'hr@panstellia.com';
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    const mailtoLink = `mailto:${email}${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="bg-[#2B1F13] text-[#f5f0e8] min-h-screen font-sans">
      <SeoHelmet 
        title="Careers | Join the Panstellia Team"
        description="Join Panstellia — we're hiring for Social Media, Customer Delight, and Jewelry QC roles. Based in Neyveli with remote options. Be part of a luxury jewelry brand."
        canonical="https://panstellia.com/careers"
        structuredData={getWebPageSchema({
          name: 'Careers — Panstellia',
          description: 'Join the Panstellia team. Open roles in Social Media, Customer Delight, and Jewelry QC. Based in Neyveli with remote options.',
          url: 'https://panstellia.com/careers',
          breadcrumbName: 'Careers'
        })}
      />

      {/* Hero Banner */}
      <section className="relative bg-[#2B1F13] py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#C89A4F] mb-6">
              Craft brilliance with Panstellia
            </h1>
            <p className="text-[#f5f0e8]/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-light">
              Be part of a team that brings exquisite jewelry to life — from design to delivery.
            </p>
            <button
              onClick={() => {
                document.getElementById('open-positions').scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-block bg-[#C89A4F] hover:bg-[#b38842] text-white font-medium px-8 py-3 rounded-md transition-colors"
            >
              See open roles
            </button>
          </motion.div>
        </div>
      </section>

      {/* Why Panstellia */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#C89A4F] uppercase tracking-[0.2em] text-xs font-bold">Why Join Us</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 text-white">Life at Panstellia</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              icon: <Sparkles className="w-6 h-6 text-[#C89A4F]" />,
              title: "Work with luxury",
              desc: "Contribute to our Elite Series and everyday premium pieces, maintaining the highest standards of quality."
            },
            {
              icon: <MapPin className="w-6 h-6 text-[#C89A4F]" />,
              title: "Small team, big impact",
              desc: "Based in Neyveli/Cuddalore, you'll work closely with founders and see the direct impact of your work."
            },
            {
              icon: <Navigation className="w-6 h-6 text-[#C89A4F]" />,
              title: "Grow with us",
              desc: "Plenty of room to expand your skills across design, operations, marketing, and customer experience."
            }
          ].map((perk, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex flex-col items-center text-center p-6 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="w-12 h-12 rounded-lg bg-[#C89A4F]/10 flex items-center justify-center mb-6">
                {perk.icon}
              </div>
              <h3 className="text-xl font-serif text-white mb-3">{perk.title}</h3>
              <p className="text-[#f5f0e8]/80 font-light leading-relaxed">{perk.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section id="open-positions" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto bg-[#2B1F13]">
        <div className="text-center mb-16">
          <span className="text-[#C89A4F] uppercase tracking-[0.2em] text-xs font-bold">Careers</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 text-white">Open Positions</h2>
        </div>

        <div className="space-y-6">
          {[
            {
              title: "Social Media & Content Creator",
              type: "Part-time / Full-time",
              location: "Neyveli / Remote",
              desc: "Drive our visual storytelling across Instagram and Pinterest. You'll plan, shoot, and edit stunning jewelry content that resonates with our audience."
            },
            {
              title: "Customer Delight Associate",
              type: "Full-time",
              location: "Remote",
              desc: "Be the voice of Panstellia. You'll guide customers through their purchasing journey, handle inquiries, and ensure every experience is purely luxurious."
            },
            {
              title: "Jewelry Packaging & QC",
              type: "Full-time",
              location: "Neyveli, Tamil Nadu",
              desc: "Ensure every Panstellia piece is perfect before it reaches our customers. You'll handle quality checks and our premium gift-wrapping process."
            }
          ].map((job, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white/5 p-6 sm:p-8 rounded-lg border border-white/10 hover:border-[#C89A4F]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-2xl font-serif text-white">{job.title}</h3>
                  <span className="bg-[#C89A4F]/10 text-[#C89A4F] text-xs px-3 py-1 rounded-full uppercase tracking-[0.1em] font-medium border border-[#C89A4F]/30">
                    {job.type}
                  </span>
                </div>
                <p className="text-[#f5f0e8]/80 font-light mb-4">{job.desc}</p>
                <div className="flex items-center text-[#f5f0e8]/60 text-sm">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {job.location}
                </div>
              </div>
              <div className="flex-shrink-0 relative z-20">
                <button
                  onClick={(e) => handleApply(e, 'Application for ' + job.title)}
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-2.5 bg-[#C89A4F] hover:bg-[#b38842] text-white rounded-md transition-all font-medium text-sm w-full sm:w-auto cursor-pointer"
                >
                  Apply Now <Briefcase className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Open Application CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center relative z-20">
        <h2 className="font-serif text-2xl md:text-3xl text-white mb-4">Don't see a fit?</h2>
        <p className="text-[#f5f0e8]/80 font-light mb-8 max-w-2xl mx-auto">
          We're always looking for talented individuals who share our passion for jewelry and exceptional customer experiences. Send us your resume and tell us how you can contribute to Panstellia.
        </p>
        <button
          onClick={(e) => handleApply(e, 'General Application')}
          className="inline-flex items-center text-[#C89A4F] border border-[#C89A4F] hover:bg-[#C89A4F] hover:text-white transition-colors rounded-md px-8 py-3 cursor-pointer"
        >
          <Mail className="w-5 h-5 mr-2" /> Get in touch
        </button>
      </section>

      {/* Footer Address */}
      <div className="py-6 text-center border-t border-white/10 bg-[#2B1F13]">
        <p className="text-[#f5f0e8]/60 text-sm flex items-center justify-center font-light">
          <MapPin className="w-4 h-4 mr-2 text-[#C89A4F]" />
          9A, Indra Nagar, Neyveli, Cuddalore, TamilNadu, India
        </p>
      </div>
    </div>
  );
};

export default Careers;