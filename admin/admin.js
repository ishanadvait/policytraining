import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../TrainingPrograms/supabase-config.js';
import { checkAdminAuth, logout } from '../TrainingPrograms/auth.js';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Edge Function URL
const INVITE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/invite-user`;

// DOM Elements
const invitationForm = document.getElementById('invitationForm');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMessage');
const successMsg = document.getElementById('successMessage');
const logoutBtn = document.getElementById('logoutBtn');
const invitationsList = document.getElementById('invitationsList');

// Check admin authentication on page load
let currentUser;
(async () => {
    const authResult = await checkAdminAuth();
    if (authResult) {
        currentUser = authResult.user;
        loadInvitations();
    }
})();

// Logout handler
logoutBtn.addEventListener('click', logout);

// Form submission
invitationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = document.getElementById('phone').value.trim();

    // Reset messages
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    // Validate email domain
    if (!email.endsWith('@ishantechnologies.com')) {
        errorMsg.textContent = 'Email must be from @ishantechnologies.com domain';
        errorMsg.style.display = 'block';
        return;
    }

    // Loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        // 1. Insert invitation record to database
        const { data: invitationData, error: dbError } = await supabase
            .from('invitations')
            .insert({
                email: email,
                display_name: displayName,
                phone: phone || null,
                invited_by: currentUser.email,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            if (dbError.code === '23505') { // Unique constraint violation
                throw new Error('User with this email has already been invited');
            }
            throw dbError;
        }

        // 2. Call Supabase Edge Function to create user and send email
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(INVITE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                displayName: displayName,
                email: email,
                phone: phone
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to send invitation');
        }

        const functionResponse = await response.json();

        // 3. Update invitation with response
        await supabase
            .from('invitations')
            .update({ n8n_response: functionResponse })
            .eq('id', invitationData.id);

        // Success!
        successMsg.textContent = `Invitation sent successfully to ${email}!`;
        successMsg.style.display = 'block';
        invitationForm.reset();

        // Reload invitations list
        loadInvitations();

    } catch (error) {
        console.error('Invitation error:', error);
        errorMsg.textContent = error.message || 'Failed to send invitation. Please try again.';
        errorMsg.style.display = 'block';

        // If DB insert succeeded but webhook failed, notify admin
        if (error.message.includes('email')) {
            errorMsg.textContent += ' (Record saved, but email delivery failed. Contact support.)';
        }
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

// Load recent invitations
async function loadInvitations() {
    try {
        const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            invitationsList.innerHTML = '<p class="empty-state">No invitations sent yet</p>';
            return;
        }

        // Render invitation items
        invitationsList.innerHTML = data.map(inv => {
            const statusClass = `status-${inv.status}`;
            const itemClass = inv.status === 'accepted' ? 'accepted' :
                             inv.status === 'expired' ? 'expired' : '';

            const createdDate = new Date(inv.created_at).toLocaleDateString();
            const acceptedDate = inv.accepted_at ?
                new Date(inv.accepted_at).toLocaleDateString() : 'N/A';

            return `
                <div class="invitation-item ${itemClass}">
                    <div class="invitation-header">
                        <span class="invitation-name">${inv.display_name}</span>
                        <span class="invitation-status ${statusClass}">${inv.status}</span>
                    </div>
                    <div class="invitation-details">
                        <div>${inv.email}</div>
                        ${inv.phone ? `<div>📞 ${inv.phone}</div>` : ''}
                        <div style="font-size: 0.8rem; margin-top: 5px; color: #999;">
                            Sent: ${createdDate} |
                            ${inv.status === 'accepted' ? `Accepted: ${acceptedDate}` :
                              inv.status === 'pending' ? 'Awaiting response' : 'Expired'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading invitations:', error);
        invitationsList.innerHTML = '<p class="empty-state">Failed to load invitations</p>';
    }
}

// Refresh invitations every 30 seconds
setInterval(loadInvitations, 30000);
