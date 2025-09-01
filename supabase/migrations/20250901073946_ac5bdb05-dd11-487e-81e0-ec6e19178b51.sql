-- HomeKart CRM Database Schema

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'employee', 'manager');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE public.property_status AS ENUM ('available', 'under_contract', 'sold', 'rented', 'off_market');
CREATE TYPE public.property_type AS ENUM ('apartment', 'villa', 'plot', 'commercial', 'office', 'warehouse');
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task', 'property_visit');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  avatar_url TEXT,
  department TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  source TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  preferred_location TEXT,
  property_type property_type,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  last_contacted TIMESTAMP WITH TIME ZONE,
  next_followup TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  property_type property_type NOT NULL,
  status property_status NOT NULL DEFAULT 'available',
  price DECIMAL(15,2) NOT NULL,
  area DECIMAL(10,2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  location TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  amenities TEXT[],
  images TEXT[],
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_property_interests table
CREATE TABLE public.lead_property_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, property_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_property_interests ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID DEFAULT auth.uid())
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
    AND is_active = true
  );
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_active = true
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- RLS Policies for teams
CREATE POLICY "Users can view teams" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage teams" ON public.teams
  FOR ALL TO authenticated
  USING (public.is_admin() OR manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for team_members
CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_admin());

-- RLS Policies for leads
CREATE POLICY "Users can view assigned leads and own created leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Users can create leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update assigned leads and own created leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- RLS Policies for properties
CREATE POLICY "Users can view all properties" ON public.properties
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create properties" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update properties they created or admins can update all" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- RLS Policies for activities
CREATE POLICY "Users can view activities related to their leads/properties" ON public.activities
  FOR SELECT TO authenticated
  USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
            created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ) OR
    public.is_admin()
  );

CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own activities" ON public.activities
  FOR UPDATE TO authenticated
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for lead_property_interests
CREATE POLICY "Users can view interests for accessible leads" ON public.lead_property_interests
  FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
            created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ) OR
    public.is_admin()
  );

CREATE POLICY "Users can manage interests for accessible leads" ON public.lead_property_interests
  FOR ALL TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
            created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ) OR
    public.is_admin()
  );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_type ON public.properties(property_type);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX idx_activities_property_id ON public.activities(property_id);
CREATE INDEX idx_activities_created_by ON public.activities(created_by);