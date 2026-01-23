import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Initialize Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check Authentication
export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Not logged in - Redirect to Login (use absolute path)
        window.location.href = '/';
    }

    return session;
}

// Check if user is admin
export async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Not logged in - Redirect to Login
        window.location.href = '/';
        return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.user_metadata?.is_admin === true;

    if (!isAdmin) {
        // Not an admin - Redirect to training hub
        window.location.href = '/TrainingPrograms/';
        return null;
    }

    return { session, user };
}

// Logout Function
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    } else {
        // Redirect to login (use absolute path)
        window.location.href = '/';
    }
}

// Auto-run check on load (can be disabled if manual check preferred)
// For simple usage, we run it immediately
checkAuth();

