import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import InfiniteCarousel from "../dashboard/Infinitemoving";
import Layout from "./Layout";

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Layout>
        <main className="pt-16">
          {/* Hero Section - Deep Blue / White Text */}
          <section className="py-24 bg-[#0f172a] text-white border-b-8 border-[#ff6b6b]">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter text-white">
                About <span className="text-[#ff6b6b]">Global</span> Shooting League
              </h1>
              <div className="w-24 h-1.5 bg-[#ff6b6b] mx-auto"></div>
            </div>
          </section>

          {/* Story Section */}
          <section className="py-20 bg-white">
            <div className="max-w-5xl mx-auto px-4">
              <h2 className="text-4xl font-black text-center mb-16 uppercase tracking-tighter text-[#1d4ed8]">
                Our <span className="text-[#ff6b6b]">Story</span>
              </h2>

              {/* The Beginning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20 group">
                <div className="relative overflow-hidden rounded-2xl shadow-xl border-4 border-white">
                  <img
                    src="/siteimages/2.JPG"
                    alt="Founding of GSL"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-4 uppercase text-[#0f172a]">The Beginning</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed font-medium">
                    At the heart of every great shot lies a story—of focus, discipline, and the relentless pursuit of excellence. Our sports magazine is a tribute to that journey. We are a team of passionate storytellers, athletes, and creatives united by one mission: to celebrate the spirit of competitive shooting and the athletes who define it. 
                  </p>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    Whether it's the slow breath before a final shot or the electric rush of hitting the bullseye, we aim to capture every pulse of the sport through powerful visuals, bold narratives, and cutting-edge insights.
                  </p>
                </div>
              </div>

              {/* Our Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20 group">
                <div className="order-2 md:order-1">
                  <h3 className="text-2xl font-black mb-4 uppercase text-[#0f172a]">Our Growth</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed font-medium">
                    We believe that Olympic shooting is more than just a sport—it's a finely tuned art form, one where technology, mental strength, and sheer willpower converge. Through our carefully curated features, in-depth articles, and visually immersive content, we bring readers closer to the ever-evolving world of shooting sports. 
                  </p>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    From covering tech innovations like AI-driven training and smart firearms to profiling the legends behind the trigger, we dive deep into what makes this sport one of the most demanding and awe-inspiring disciplines in the world of athletics.
                  </p>
                </div>
                <div className="order-1 md:order-2 relative overflow-hidden rounded-2xl shadow-xl border-4 border-white">
                  <img
                    src="/siteimages/4.jpg"
                    alt="GSL Growth"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>

              {/* GSL Today */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center group">
                <div className="relative overflow-hidden rounded-2xl shadow-xl border-4 border-white">
                  <img
                    src="/siteimages/3.JPG"
                    alt="GSL Today"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-4 uppercase text-[#0f172a]">GSL Today</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed font-medium">
                    Our platform is designed not just for seasoned enthusiasts, but for the next generation of sharpshooters and fans who want to learn, engage, and be inspired. With every issue, every article, and every image, we aim to fire up passion, spark curiosity, and drive conversations that elevate the sport.
                  </p>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    We're not just telling stories—we're shaping the future of shooting, one perfectly placed word (and shot) at a time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Vision & Mission Section - Deep Blue / White Text */}
          <section className="bg-[#0f172a] px-6 py-24 text-white md:px-16 border-y-4 border-[#ff6b6b]">
            <div className="max-w-6xl mx-auto space-y-20 lg:grid lg:grid-cols-1 lg:gap-16 lg:space-y-0">
              {/* Vision */}
              <div className="lg:flex lg:justify-between lg:space-x-8">
                <h2 className="mb-6 text-xl font-black uppercase lg:mb-0 lg:text-7xl text-[#ff6b6b] tracking-tighter">
                  Vision
                </h2>
                <div className="text-lg leading-relaxed lg:w-1/2 text-justify">
                  <p className="mb-4 text-white">
                    At Global Shooting League, we envision a world where sports shooting is accessible, inclusive, and celebrated across every corner of the globe. Our goal is to democratize the sport through the infusion of advanced technology, innovation, and strategic collaborations—aiming to make shooting sports a mainstream pursuit by 2030. We believe in nurturing a global community that thrives on precision, discipline, and shared excellence.
                  </p>
                </div>
              </div>

              {/* Mission */}
              <div className="lg:flex lg:items-start lg:justify-between lg:space-x-8">
                <h2 className="mb-6 text-xl font-black uppercase lg:mb-0 lg:text-7xl text-[#1d4ed8] tracking-tighter">
                  Mission
                </h2>
                <div className="text-lg leading-relaxed lg:w-1/2 text-justify">
                  <p className="mb-4 text-white">
                    Our mission is to build a thriving ecosystem for sports shooting by bringing together all key stakeholders—shooters, coaches, range operators, manufacturers, media professionals, and fans—under one unified digital and physical platform. Through our cutting-edge website, mobile applications, and on-ground initiatives, we aim to:
                  </p>
                  <ul className="list-none space-y-4">
                    {[
                      "Promote awareness and participation in shooting sports across India and the world.",
                      "Identify and nurture young talent while establishing world-class infrastructure and centers of excellence in every region.",
                      "Drive professional development through competitions, training, and data-driven talent management.",
                      "Facilitate the growth of indigenous manufacturing for top-tier shooting equipment, supporting the Make-in-India initiative."
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-[#ff6b6b] mr-2 font-bold text-xl">●</span>
                        <span className="text-white">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Core Values Section */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-4xl font-black text-center mb-16 uppercase tracking-tighter text-[#0f172a]">
                Core <span className="text-[#ff6b6b]">Framework</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Value Cards */}
                {[
                  { title: "Safety", content: "We prioritize safety above all else, implementing rigorous protocols and standards at all our events and training programs to ensure a secure environment for participants and spectators alike." },
                  { title: "Inclusivity", content: "We believe that shooting sports should be accessible to all, regardless of background, gender, or ability. Our programs and competitions are designed to welcome and support diverse participation." },
                  { title: "Excellence", content: "We strive for excellence in everything we do, from the organization of our events to the development of our athletes. We set high standards and continuously work to exceed them." },
                  { title: "Governance Policy", content: "GSL upholds the highest standards of transparency, ethics, and accountability. Our governance framework is designed to ensure fair decision-making, inclusive representation, and responsible leadership. Our policies support data privacy, athlete welfare, and equal opportunity." }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 group hover:border-[#ff6b6b]/30 transition-all">
                    <h3 className="text-xl font-black mb-4 uppercase tracking-tight text-[#1d4ed8]">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-sm font-medium">{item.content}</p>
                  </div>
                ))}
                
                {/* Full Width Culture and Proposition */}
                <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black mb-4 uppercase tracking-tight text-[#ff6b6b]">Value Proposition</h3>
                  <div className="text-gray-600 text-sm leading-relaxed space-y-4 font-medium">
                    <p>At Global Shooting League (GSL), we offer a unified platform that elevates every dimension of the shooting sports ecosystem—from grassroots talent to elite competition. By combining technology, community, and strategic storytelling, we provide a space where shooters, coaches, ranges, manufacturers, and fans can connect, collaborate, and grow.</p>
                    <p>GSL stands apart by delivering: Digital Empowerment, Talent Discovery & Development, Infrastructure Integration, Media & Visibility, and Community-Led Innovation. GSL is more than a league—it's a movement that transforms how the world sees, experiences, and supports shooting sports.</p>
                  </div>
                </div>

                <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black mb-4 uppercase tracking-tight text-[#0f172a]">Our Culture</h3>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium">
                    At Global Shooting League (GSL), our culture is built on the foundation of precision, integrity, and innovation—reflecting the very essence of shooting sports. We are a purpose-driven organization with a deep commitment to excellence, collaboration, and inclusivity. We celebrate focus and discipline, encourage bold ideas, and believe in empowering individuals to take ownership of the mission. We celebrate focus and discipline, encourage bold ideas, and believe in empowering individuals to take ownership of the mission.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Leadership Team - WHITE BACKGROUND */}
          <section className="py-24 bg-white">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-4xl font-black text-center mb-20 uppercase tracking-tighter text-[#1d4ed8]">
                Our <span className="text-[#ff6b6b]">Leadership</span> Team
              </h2>

              <div className="space-y-24">
                {/* Leadership Member List - Full Bios Restored */}
                {[
                  {
                    name: "Col. Prem Rajpurohit",
                    img: "/images/Col. Prem.jpg",
                    bio: "With over three decades of distinguished service in the Indian Army, I've lived a life defined by discipline, endurance, and an unwavering love for sport. From the rugged terrains of the Himalayas to bustling cantonments across the country, I've remained a lifelong sportsman at heart. Whether it's hockey, football, golf, shooting, swimming, cycling, mountaineering, or running—you'll find me not just supporting the game but playing it with passion. Fitness isn't a routine; it's a way of life, and I don't end a day without a workout.\n\nShooting, in particular, has always held a special place for me. As a qualified armament instructor and coach, I bring a deep, hands-on understanding of the sport's ecosystem—both from a technical and strategic perspective. My experience has given me insights into the broader dynamics of sports shooting, and I firmly believe that with the right vision and collaboration, the sport is poised for transformative growth at the global level.\n\nMy vision for shooting goes beyond medals and podiums. I aim to democratize access to the sport by integrating affordable technology that reduces barriers to entry and makes shooting more inclusive for enthusiasts across the country. As a serial entrepreneur and a firm believer in purposeful innovation, I'm committed to building systems that empower athletes, coaches, and communities alike."
                  },
                  {
                    name: "Mr Anvesh Pandey",
                    img: "/images/AvnishPandey.jpg",
                    bio: "Driven by a deep passion for sports and a growing admiration for shooting, I've found meaning in capturing impactful moments—both on the range and beyond. My journey with platforms like the Global Shooting League (GSL) and Shooters' Scope Magazine revolves around blending action with insight, where storytelling, stats, and strategic thinking spotlight a sport grounded in precision and discipline.\n\nWith a background in business development and digital content, I've focused on creating narratives that do more than inform—they inspire and elevate. From highlighting emerging athletes and showcasing local ranges to developing campaigns that cross borders, my goal is to make shooting more visible, engaging, and globally appreciated—especially through compelling short-form and multimedia content.\n\nAlongside my work in sports, I bring over 17 years of leadership experience in the banking and investment industry. I am a SEBI-registered Investment Advisor, certified by CIEL, with additional certifications from NISM and AMFI. Currently pursuing a Ph.D. in Cloud Funding, I'm passionate about merging financial strategy with sports innovation—empowering grassroots ranges, emerging talent, and tech-driven ventures through sustainable, well-structured funding ecosystems."
                  },
                  {
                    name: "Mr. Pravash Dey",
                    img: "/images/Pravashsir.png",
                    bio: "Fuelled by a deep love for sports and an ever-growing respect for shooting, I've found purpose in capturing the sharpest moments, both in competition and behind the scenes. My journey with platforms like the Global Shooting League (GSL) and Shooters' Scope Magazine has been all about blending performance with perspective—where short stories, stats, and strategy come together to spotlight a sport defined by focus and finesse.\n\nWith a background in business development and digital content, I've worked on building narratives that don't just inform—they inspire. Whether it's promoting up-and-coming athletes, driving visibility for local ranges, or shaping campaigns that resonate across borders, my aim is simple: make shooting more accessible, exciting, and relatable to a global audience.\n\nI'm also committed to building a SportsTech platform from Bharat for the world—one that blends Technology, Transparency, Talent, and Trust. With a vision to Inspire, Invest, and Impact, I believe in using innovation to amplify the voices of our sports community and shape a future where stories, athletes, and opportunities travel far beyond borders."
                  },
                  {
                    name: "Ms. Zoya Khan",
                    img: "/images/ZoyaKhan.jpg",
                    bio: "As a dedicated sports enthusiast with a strong inclination towards shooting sports, I've always believed in the power of sport to inspire, unite, and transform lives. My journey in the sports ecosystem has been driven by a passion to create meaningful impact—both on and off the field. Currently contributing to initiatives like the Global Shooting League (GSL) and Shooters' Scope Magazine, I work at the intersection of sport, storytelling, and strategy.\n\nWith a background in business development and marketing, I focus on promoting shooting as a sport that combines mental strength, precision, and discipline. I've been involved in creating platforms that spotlight emerging talent, enhance visibility for shooting ranges, and foster global collaborations. My goal is to bridge the gap between grassroots and elite-level shooting by building strong networks, celebrating athlete journeys, and driving engagement through powerful narratives."
                  },
                  {
                    name: "Ms. Astha Bisht",
                    img: "/images/AsthaBisht.jpg",
                    bio: "Fuelled by a passion for sports and a keen eye for detail, I've found my calling at the intersection of research, data, and the dynamic world of shooting sports. My journey with the Global Shooting League (GSL) and Shooters' Scope Magazine has been rooted in a mission to go beyond the surface—gathering insights, understanding trends, and bringing athlete stories to life through evidence-based narratives.\n\nWith a strong interest in sports data analytics and performance metrics, I focus on collecting and analysing information that helps spotlight emerging talent, assess infrastructure gaps, and shape more informed conversations around shooting sports. Through strategic storytelling and research-backed features, I aim to contribute to a platform that not only informs, but inspires the entire shooting community to grow together, grounded in data and driven by purpose."
                  },
                  {
                    name: "Ms. Esha Jamwal",
                    img: "/images/EshaJamwal.jpg",
                    bio: "My journey into the world of shooting sports has been a creative adventure shaped by instinct, storytelling, and a deep respect for the athletes who live and breathe precision. With a background in content strategy and visual communication, I've found my space at the intersection of sport and storytelling—where every image, every word, and every moment has the power to connect and inspire.\n\nAt the Global Shooting League (GSL) and Shooters' Scope Magazine, I lead projects that go beyond traditional coverage. Whether it's building athlete-focused campaigns, developing visual narratives, or curating stories that highlight the unseen side of the sport, I strive to bring authenticity and impact to everything I do. My goal is to spotlight that world through a creative lens—celebrating the people, the process, and the passion that define this sport in its purest form."
                  }
                ].map((member, i) => (
                  <div key={i} className="flex flex-col md:flex-row gap-12 items-start border-b border-gray-100 pb-16 last:border-0">
                    <div className="shrink-0 mx-auto md:mx-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#ff6b6b] rounded-full translate-x-2 translate-y-2 -z-10"></div>
                        <img
                          src={member.img}
                          alt={member.name}
                          className="w-48 h-48 rounded-full border-4 border-white object-cover shadow-lg"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black uppercase text-[#0f172a] mb-2 tracking-tight">{member.name}</h3>
                      <div className="w-16 h-1 bg-[#1d4ed8] mb-6"></div>
                      <p className="text-gray-600 text-sm leading-relaxed text-justify whitespace-pre-line font-medium">
                        {member.bio}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section - Deep Blue / White Text */}
          <section className="py-24 bg-[#0f172a] text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ff6b6b]"></div>
            <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase tracking-tighter text-white">
                Join the <span className="text-[#ff6b6b]">Movement</span>
              </h2>
              <p className="text-xl mb-12 font-medium opacity-80 text-white">
                Whether you're a seasoned enthusiast or a rising talent, there's a place for you in our global community.
              </p>
              <Link to="/signup">
                <button className="bg-blue-700 hover:bg-[#ff6b6b] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm transition-all transform hover:scale-105 shadow-2xl">
                  Sign Up Today
                </button>
              </Link>
            </div>
          </section>
        </main>
      </Layout>
    </div>
  );
}