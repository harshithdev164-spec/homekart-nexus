import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, BarChart3, MessageSquare, Mail, Calendar, Star, CheckCircle, Sparkles, ArrowRight, Zap, Shield, TrendingUp, Globe } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Animated particles background
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number }> = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${0.3})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Lead Management',
      description: 'Track and manage leads through the entire sales pipeline with automated follow-ups and reminders.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Building2,
      title: 'Property Inventory',
      description: 'Complete property management with detailed listings, images, and advanced search capabilities.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Detailed insights and reports to help you make data-driven decisions and track performance.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Integration',
      description: 'Direct WhatsApp integration for seamless communication with leads and clients.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Mail,
      title: 'Email Marketing',
      description: 'Zoho Mail integration for professional email campaigns and client communication.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Calendar,
      title: 'Team Collaboration',
      description: 'Advanced team management with role-based access and collaborative workspaces.',
      gradient: 'from-teal-500 to-cyan-500',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Perplexity AI integration for intelligent property matching and market insights.',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Instant notifications and real-time collaboration for your entire team.',
      gradient: 'from-pink-500 to-rose-500',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500K+', label: 'Leads Managed' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
  ];

  const testimonials = [
    {
      name: 'Rajesh Kumar',
      role: 'Real Estate Manager',
      content: 'HomeKart CRM has transformed our business. Lead conversion has increased by 40% since we started using it.',
      rating: 5,
      avatar: 'RK',
    },
    {
      name: 'Priya Sharma',
      role: 'Property Consultant',
      content: 'The most intuitive CRM I\'ve used. Managing properties and leads has never been easier.',
      rating: 5,
      avatar: 'PS',
    },
    {
      name: 'Amit Patel',
      role: 'Team Lead',
      content: 'Excellent team collaboration features. Our entire sales process is now streamlined.',
      rating: 5,
      avatar: 'AP',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-30"
        style={{ zIndex: 0 }}
      />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="backdrop-blur-xl bg-black/20 border-b border-white/10 px-6 py-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Building2 className="h-8 w-8 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/50 blur-xl" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                HomeKart CRM
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => navigate('/auth')}
              >
                Login
              </Button>
              <Button 
                className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white border-0 shadow-lg shadow-primary/50"
                onClick={() => navigate('/auth')}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-8 inline-block">
              <Badge className="bg-primary/20 text-primary border-primary/50 px-4 py-2 text-sm mb-4 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-2" />
                AI-Powered Real Estate CRM
              </Badge>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-primary to-purple-400 bg-clip-text text-transparent animate-gradient">
                Transform Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Real Estate Business
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-white/80 leading-relaxed">
              The most powerful CRM platform designed specifically for real estate professionals. 
              <br />
              <span className="text-primary font-semibold">Manage leads, properties, and teams</span> all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white border-0 shadow-2xl shadow-primary/50 hover:scale-105 transition-transform"
                onClick={() => navigate('/auth')}
              >
                Login to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-transform"
              >
                <Globe className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10 hover:border-primary/50 transition-all hover:scale-105">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="bg-primary/20 text-primary border-primary/50 px-4 py-2 mb-4 backdrop-blur-sm">
                Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Powerful Features for Real Estate Success
              </h2>
              <p className="text-xl text-white/60 max-w-2xl mx-auto">
                Everything you need to manage your real estate business efficiently and grow your revenue.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="backdrop-blur-xl bg-white/5 border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 group"
                >
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-white/60 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="bg-primary/20 text-primary border-primary/50 px-4 py-2 mb-4 backdrop-blur-sm">
                Testimonials
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Trusted by Real Estate Professionals
              </h2>
              <p className="text-xl text-white/60">
                See what our customers have to say about HomeKart CRM
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card
                  key={index}
                  className="backdrop-blur-xl bg-white/5 border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-white/80 mb-6 leading-relaxed">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{testimonial.name}</div>
                        <div className="text-sm text-white/60">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="backdrop-blur-xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-3xl p-12 border border-white/20 shadow-2xl">
              <h3 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Ready to Transform Your Business?
              </h3>
              <p className="text-xl mb-8 text-white/80">
                Join thousands of real estate professionals who trust HomeKart CRM to grow their business.
              </p>
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white border-0 shadow-2xl shadow-primary/50 hover:scale-105 transition-transform"
                onClick={() => navigate('/auth')}
              >
                Login to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center gap-8 mt-12 text-sm text-white/60 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Secure & Reliable</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Enterprise Ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="backdrop-blur-xl bg-black/20 border-t border-white/10 py-8 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-primary" />
              <div className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                HomeKart CRM
              </div>
            </div>
            <p className="text-white/60">
              © 2024 HomeKart CRM. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
