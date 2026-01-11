import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, 
  UserCog, 
  Shield, 
  User as UserIcon,
  Search,
  ChevronDown,
  Download,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  title: string | null;
  created_at: string;
  role: 'admin' | 'user';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, title, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to users
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as 'admin' | 'user']) || []);
      
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || 'user'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    setUpdatingRole(userId);
    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      user.email.toLowerCase().includes(query) ||
      (user.full_name?.toLowerCase().includes(query) || false)
    );
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Title', 'Role', 'Joined'];
    const csvRows = [
      headers.join(','),
      ...filteredUsers.map(user => [
        `"${user.full_name || 'Unknown'}"`,
        `"${user.email}"`,
        `"${user.title || ''}"`,
        `"${user.role}"`,
        `"${format(new Date(user.created_at), 'yyyy-MM-dd')}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredUsers.length} users to CSV`);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>
              View all users and manage their roles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={exportToCSV} 
              disabled={loading || filteredUsers.length === 0} 
              variant="outline" 
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchUsers} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value: 'all' | 'admin' | 'user') => setRoleFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Admin
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3 h-3" />
                  User
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {user.full_name 
                            ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            : user.email.substring(0, 2).toUpperCase()
                          }
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {user.full_name || 'Unknown'}
                          </p>
                          {user.title && (
                            <p className="text-xs text-muted-foreground">{user.title}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={user.role === 'admin' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                          : 'bg-muted text-muted-foreground'
                        }
                      >
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3 mr-1" />
                        ) : (
                          <UserIcon className="w-3 h-3 mr-1" />
                        )}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={updatingRole === user.id}
                          >
                            {updatingRole === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Change Role
                                <ChevronDown className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => updateUserRole(user.id, 'user')}
                            disabled={user.role === 'user'}
                          >
                            <UserIcon className="w-4 h-4 mr-2" />
                            Set as User
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateUserRole(user.id, 'admin')}
                            disabled={user.role === 'admin'}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Set as Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
