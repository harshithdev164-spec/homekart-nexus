import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, BarChart3, MessageSquare, Mail, Calendar, Star, CheckCircle } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Lead Management',
      description: 'Track and manage leads through the entire sales pipeline with automated follow-ups and reminders.',
    },
    {
      icon: Building2,
      title: 'Property Inventory',
      description: 'Complete property management with detailed listings, images, and advanced search capabilities.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Detailed insights and reports to help you make data-driven decisions and track performance.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Integration',
      description: 'Direct WhatsApp integration for seamless communication with leads and clients.',
    },
    {
      icon: Mail,
      title: 'Email Marketing',
      description: 'Zoho Mail integration for professional email campaigns and client communication.',
    },
    {
      icon: Calendar,
      title: 'Team Collaboration',
      description: 'Advanced team management with role-based access and collaborative workspaces.',
    },
  ];

  const testimonials = [
    {
      name: 'Rajesh Kumar',
      role: 'Real Estate Manager',
      content: 'HomeKart CRM has transformed our business. Lead conversion has increased by 40% since we started using it.',
      rating: 5,
    },
    {
      name: 'Priya Sharma',
      role: 'Property Consultant',
      content: 'The most intuitive CRM I\'ve used. Managing properties and leads has never been easier.',
      rating: 5,
    },
    {
      name: 'Amit Patel',
      role: 'Team Lead',
      content: 'Excellent team collaboration features. Our entire sales process is now streamlined.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              HomeKart CRM
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <img
          src={heroImage}
          alt="Real Estate CRM"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center text-white">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Transform Your Real Estate Business
          </h2>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            The most powerful CRM platform designed specifically for real estate professionals. 
            Manage leads, properties, and teams all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-4" onClick={() => navigate('/auth')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Powerful Features for Real Estate Success</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your real estate business efficiently and grow your revenue.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-medium hover:shadow-large transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Trusted by Real Estate Professionals</h3>
            <p className="text-xl text-muted-foreground">
              See what our customers have to say about HomeKart CRM
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-medium">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-primary text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold mb-6">Ready to Transform Your Business?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of real estate professionals who trust HomeKart CRM to grow their business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4" onClick={() => navigate('/auth')}>
              Start Your Free Trial
            </Button>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            HomeKart CRM
          </div>
          <p className="text-muted-foreground">
            © 2024 HomeKart CRM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;