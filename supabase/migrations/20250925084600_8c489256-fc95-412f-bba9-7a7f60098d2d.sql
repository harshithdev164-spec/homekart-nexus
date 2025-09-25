-- Add foreign key constraint for reports.generated_by -> profiles.id
ALTER TABLE reports 
ADD CONSTRAINT reports_generated_by_fkey 
FOREIGN KEY (generated_by) REFERENCES profiles(id);