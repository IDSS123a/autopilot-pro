import React, { useState } from 'react';
import { Save, User, Briefcase, MapPin, Loader2, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Settings: React.FC = () => {
  const { userProfile, updateUserProfile } = useApp();
  const { toast } = useToast();
  const [profile, setProfile] = useState(userProfile);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateUserProfile(profile);
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: 'Settings saved', description: 'Your profile has been updated successfully.' });
    }, 500);
  };

  const fields = [
    { key: 'name', label: 'Full Name', icon: User },
    { key: 'title', label: 'Current Title', icon: Briefcase },
    { key: 'company', label: 'Company', icon: Briefcase },
    { key: 'email', label: 'Email', icon: User },
    { key: 'phone', label: 'Phone', icon: User },
    { key: 'location', label: 'Location', icon: MapPin },
    { key: 'linkedin', label: 'LinkedIn URL', icon: User },
    { key: 'targetRole', label: 'Target Roles', icon: Briefcase },
    { key: 'industries', label: 'Target Industries', icon: Briefcase },
    { key: 'salaryMin', label: 'Salary Expectation', icon: Briefcase },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-heading font-semibold text-foreground mb-6">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={(profile as any)[key] || ''} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <Label htmlFor="bio">Professional Bio</Label>
          <textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="w-full h-32 bg-input border border-border rounded-lg p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>
      </div>
    </div>
  );
};

export default Settings;
