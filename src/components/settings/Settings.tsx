import React, { useState, useEffect } from 'react';
import { Save, User, Briefcase, MapPin, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Settings: React.FC = () => {
  const { userProfile, updateUserProfile, user } = useApp();
  const { toast } = useToast();
  const [profile, setProfile] = useState(userProfile);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when userProfile changes (e.g., loaded from DB)
  useEffect(() => {
    setProfile(userProfile);
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to save settings', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(profile);
      toast({ title: 'Settings saved', description: 'Your profile has been updated successfully.' });
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Failed to save settings. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Full Name', icon: User },
    { key: 'title', label: 'Current Title', icon: Briefcase },
    { key: 'company', label: 'Company', icon: Briefcase },
    { key: 'email', label: 'Email', icon: User },
    { key: 'phone', label: 'Phone', icon: User },
    { key: 'location', label: 'Location', icon: MapPin },
    { key: 'linkedin', label: 'LinkedIn URL', icon: User },
    { key: 'targetRole', label: 'Target Roles (comma separated)', icon: Briefcase },
    { key: 'industries', label: 'Target Industries (comma separated)', icon: Briefcase },
    { key: 'salaryMin', label: 'Salary Expectation', icon: Briefcase },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !user}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {!user && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
          <p className="text-destructive">You must be logged in to save settings</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-heading font-semibold text-foreground mb-6">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <Input 
                id={key} 
                value={(profile as any)[key] || ''} 
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} 
                placeholder={label}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <Label htmlFor="bio">Professional Bio</Label>
          <textarea 
            id="bio" 
            value={profile.bio || ''} 
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })} 
            className="w-full h-32 bg-input border border-border rounded-lg p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder="Write your professional bio here..."
          />
        </div>
      </div>

      {/* Debug info - can be removed in production */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground">
        <p>Current user ID: {user?.id || 'Not logged in'}</p>
        <p>Profile loaded: {profile.name ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default Settings;