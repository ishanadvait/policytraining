import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Initialize Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check Authentication
export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Not logged in - Redirect to Login
        // We need to handle relative paths depending on where this script is called from
        // Assuming this is called from files inside /TrainingPrograms/ or /TrainingPrograms/Module/

        // Simple check: if we are in a submodule (e.g. POSH/), we need to go up 2 levels
        // If we are in TrainingPrograms root, we need to go up 1 level.

        // Determine depth to find login.html
        const path = window.location.pathname;
        let loginPath = './login.html'; // Default assumtion

        // If we are in TrainingPrograms root (e.g. /TrainingPrograms/index.html)
        if (path.match(/\/TrainingPrograms\/[^/]+$/)) {
            loginPath = '../login.html';
        }
        // If we are in a module (e.g. /TrainingPrograms/POSH/index.html)
        else if (path.match(/\/TrainingPrograms\/[^/]+\/[^/]+$/)) {
            loginPath = '../../login.html';
        }

        // Final fallback for local file system (harder to detect path, rely on relative)
        // If the script is loaded as ../auth.js, we are 1 level deep from auth.js
        // If we are 1 level deep from auth.js, we are 2 levels deep from login.html

        // Simpler check by document location
        if (document.location.href.indexOf('/TrainingPrograms/index.html') > -1) {
            loginPath = '../login.html';
        } else if (document.location.href.split('/').length > 5) {
            // Heuristic for module subfolders
            loginPath = '../../login.html';
        }

        window.location.href = loginPath;
    }

    return session;
}

// Logout Function
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    } else {
        // Redirect to login
        const path = window.location.pathname;
        let loginPath = '../login.html';
        if (path.includes('/POSH/') || path.includes('/DataPrivacy/') || path.includes('/HSE/') || path.includes('/CyberSecurity/') || path.includes('/AntiCorruption/')) {
            loginPath = '../../login.html';
        }
        window.location.href = loginPath;
    }
}

// Auto-run check on load (can be disabled if manual check preferred)
// For simple usage, we run it immediately
checkAuth();
