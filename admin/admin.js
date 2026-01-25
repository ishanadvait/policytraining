// Admin Dashboard JavaScript
const SUPABASE_URL = 'https://xrxsqivbytniuovblwqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHNxaXZieXRuaXVvdmJsd3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODE5ODYsImV4cCI6MjA4NDE1Nzk4Nn0.BzfVg0dmrbHvKtTa3p53D7ptQC-ZT5OoAJeCl8UzKHo';
const INVITE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/invite-user`;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let allUsers = [];
let allProgress = [];
let moduleChart = null;
let activityChart = null;

// Module info
const MODULES = [
    { id: 'anticorruption', name: 'Anti-Corruption', icon: '🛡️', color: '#3b82f6' },
    { id: 'posh', name: 'POSH', icon: '⚖️', color: '#db2777' },
    { id: 'dataprivacy', name: 'Data Privacy', icon: '🔐', color: '#0ea5e9' },
    { id: 'hse', name: 'HSE', icon: '⛑️', color: '#10b981' },
    { id: 'cybersecurity', name: 'Cyber Security', icon: '💻', color: '#ef4444' }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    setupNavigation();
    setupEventListeners();
    await loadAllData();
});

// Check admin authentication
async function checkAdminAuth() {
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
        window.location.href = '/';
        return;
    }

    const { data: { user } } = await sb.auth.getUser();
    const isAdmin = user?.user_metadata?.is_admin === true ||
        user?.email === 'gautam.advait@ishantechnologies.com';

    if (!isAdmin) {
        window.location.href = '/TrainingPrograms/';
        return;
    }

    currentUser = user;

    // Update admin info in sidebar
    const adminName = document.getElementById('adminName');
    const adminAvatar = document.querySelector('.admin-avatar');
    if (adminName) adminName.textContent = user.email.split('@')[0];
    if (adminAvatar) adminAvatar.textContent = user.email.charAt(0).toUpperCase();
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;

            // Update nav active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding section
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`${sectionId}Section`).classList.add('active');

            // Update page title
            const titles = {
                dashboard: 'Dashboard',
                users: 'User Management',
                invite: 'Invite User',
                reports: 'Reports'
            };
            pageTitle.textContent = titles[sectionId] || 'Dashboard';

            // Close mobile sidebar
            document.querySelector('.sidebar').classList.remove('open');
        });
    });

    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await sb.auth.signOut();
        window.location.href = '/';
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadAllData);

    // Invitation form
    document.getElementById('invitationForm').addEventListener('submit', handleInviteSubmit);

    // User search
    document.getElementById('userSearch').addEventListener('input', filterUsers);

    // Status filter
    document.getElementById('statusFilter').addEventListener('change', filterUsers);

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportUsersCSV);
}

// Load all data
async function loadAllData() {
    try {
        // Load invitations
        const { data: invitations, error: invError } = await sb
            .from('invitations')
            .select('*')
            .order('created_at', { ascending: false });

        if (invError) throw invError;
        allUsers = invitations || [];

        // Get all user IDs
        const userIds = allUsers
            .map(inv => inv.n8n_response?.user_id || inv.user_id)
            .filter(id => id);

        // Load progress
        if (userIds.length > 0) {
            const { data: progress, error: progError } = await sb
                .from('user_progress')
                .select('*')
                .in('user_id', userIds);

            if (!progError) allProgress = progress || [];
        } else {
            allProgress = [];
        }

        // Update all views
        updateStats();
        updateCharts();
        updateModuleStats();
        updateRecentActivity();
        renderUsersTable();

        // Update timestamp
        document.getElementById('lastUpdated').textContent =
            `Last updated: ${new Date().toLocaleTimeString()}`;

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Update stats cards
function updateStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => {
        const userId = u.n8n_response?.user_id || u.user_id;
        return userId && allProgress.some(p => p.user_id === userId);
    }).length;
    const pending = allUsers.filter(u => u.status === 'pending' || !u.status).length;

    // Calculate completion rate
    let completionRate = 0;
    if (allUsers.length > 0) {
        const totalPossible = allUsers.length * 5; // 5 modules per user
        const totalCompleted = allProgress.filter(p => p.status === 'completed').length;
        completionRate = Math.round((totalCompleted / totalPossible) * 100) || 0;
    }

    document.getElementById('totalUsers').textContent = total;
    document.getElementById('activeUsers').textContent = active;
    document.getElementById('pendingUsers').textContent = pending;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
}

// Update charts
function updateCharts() {
    // Module completion chart
    const moduleData = MODULES.map(m => {
        return allProgress.filter(p => p.module_id === m.id && p.status === 'completed').length;
    });

    const moduleCtx = document.getElementById('moduleChart').getContext('2d');

    if (moduleChart) moduleChart.destroy();

    moduleChart = new Chart(moduleCtx, {
        type: 'bar',
        data: {
            labels: MODULES.map(m => m.name),
            datasets: [{
                label: 'Completions',
                data: moduleData,
                backgroundColor: MODULES.map(m => m.color),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });

    // Activity chart (last 30 days)
    const last30Days = [];
    const activityData = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last30Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        const count = allProgress.filter(p => {
            if (!p.completed_at) return false;
            return p.completed_at.startsWith(dateStr);
        }).length;
        activityData.push(count);
    }

    const activityCtx = document.getElementById('activityChart').getContext('2d');

    if (activityChart) activityChart.destroy();

    activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: last30Days,
            datasets: [{
                label: 'Completions',
                data: activityData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { ticks: { maxTicksLimit: 7 } }
            }
        }
    });
}

// Update module stats
function updateModuleStats() {
    const grid = document.getElementById('moduleStatsGrid');
    const totalUsers = allUsers.length || 1;

    grid.innerHTML = MODULES.map(m => {
        const completed = allProgress.filter(p => p.module_id === m.id && p.status === 'completed').length;
        const percentage = Math.round((completed / totalUsers) * 100);
        const avgScore = allProgress
            .filter(p => p.module_id === m.id && p.status === 'completed')
            .reduce((acc, p) => acc + (p.score || 0), 0) / (completed || 1);

        return `
            <div class="module-stat-item">
                <div class="module-icon">${m.icon}</div>
                <div class="module-name">${m.name}</div>
                <div class="module-progress">
                    <div class="module-progress-bar" style="width: ${percentage}%; background: ${m.color}"></div>
                </div>
                <div class="module-stats-text">${completed}/${totalUsers} completed (${percentage}%)</div>
                <div class="module-stats-text">Avg Score: ${avgScore.toFixed(0)}</div>
            </div>
        `;
    }).join('');
}

// Update recent activity
function updateRecentActivity() {
    const container = document.getElementById('recentActivity');

    const recentCompletions = allProgress
        .filter(p => p.status === 'completed' && p.completed_at)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(0, 10);

    if (recentCompletions.length === 0) {
        container.innerHTML = '<p class="loading-text">No recent completions</p>';
        return;
    }

    container.innerHTML = recentCompletions.map(p => {
        const user = allUsers.find(u => (u.n8n_response?.user_id || u.user_id) === p.user_id);
        const module = MODULES.find(m => m.id === p.module_id);
        const timeAgo = getTimeAgo(new Date(p.completed_at));

        return `
            <div class="activity-item">
                <div class="activity-avatar">${(user?.display_name || 'U').charAt(0).toUpperCase()}</div>
                <div class="activity-details">
                    <div class="activity-text">
                        <strong>${user?.display_name || 'Unknown User'}</strong> completed
                        <strong>${module?.name || p.module_id}</strong>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
                <span class="activity-score">${p.score || 0} pts</span>
            </div>
        `;
    }).join('');
}

// Render users table
function renderUsersTable(filteredUsers = null) {
    const tbody = document.getElementById('usersTableBody');
    const users = filteredUsers || allUsers;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const userId = user.n8n_response?.user_id || user.user_id;
        const userProgress = allProgress.filter(p => p.user_id === userId);
        const completed = userProgress.filter(p => p.status === 'completed').length;
        const totalScore = userProgress.reduce((acc, p) => acc + (p.score || 0), 0);

        // Determine status
        let status = 'pending';
        let statusClass = 'status-pending';
        if (completed > 0) {
            status = 'active';
            statusClass = 'status-active';
        } else if (user.status === 'accepted' || userId) {
            status = 'active';
            statusClass = 'status-active';
        } else if (user.status === 'expired') {
            status = 'expired';
            statusClass = 'status-expired';
        }

        // Last activity
        const lastActivity = userProgress
            .filter(p => p.completed_at)
            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];
        const lastActivityText = lastActivity
            ? getTimeAgo(new Date(lastActivity.completed_at))
            : 'Never';

        const invitedDate = new Date(user.created_at).toLocaleDateString();
        const initials = (user.display_name || 'U').charAt(0).toUpperCase();

        return `
            <tr data-user-id="${user.id}">
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <span class="user-name">${user.display_name || 'Unknown'}</span>
                            <span class="user-email">${user.email}</span>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    <div class="modules-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(completed / 5) * 100}%"></div>
                        </div>
                        <span>${completed}/5</span>
                    </div>
                </td>
                <td>${totalScore > 0 ? `<span class="score-badge">${totalScore} pts</span>` : '-'}</td>
                <td>${lastActivityText}</td>
                <td>${invitedDate}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" onclick="viewUserDetails('${user.id}')">View</button>
                        <button class="action-btn edit" onclick="editUser('${user.id}', '${user.display_name || ''}')">Edit</button>
                        ${status === 'pending' ? `<button class="action-btn resend" onclick="resendInvite('${user.email}', '${user.display_name}')">Resend</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter users
function filterUsers() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let filtered = allUsers.filter(user => {
        const matchesSearch =
            user.display_name?.toLowerCase().includes(search) ||
            user.email?.toLowerCase().includes(search);

        if (!matchesSearch) return false;

        if (statusFilter === 'all') return true;

        const userId = user.n8n_response?.user_id || user.user_id;
        const userProgress = allProgress.filter(p => p.user_id === userId);
        const completed = userProgress.filter(p => p.status === 'completed').length;

        if (statusFilter === 'active') return completed > 0 || userId;
        if (statusFilter === 'pending') return !userId && user.status !== 'expired';
        if (statusFilter === 'expired') return user.status === 'expired';

        return true;
    });

    renderUsersTable(filtered);
}

// Handle invite form submit
async function handleInviteSubmit(e) {
    e.preventDefault();

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = document.getElementById('phone').value.trim();
    const department = document.getElementById('department').value;

    const errorEl = document.getElementById('inviteError');
    const successEl = document.getElementById('inviteSuccess');
    const submitBtn = document.getElementById('submitBtn');

    // Reset alerts
    errorEl.classList.remove('show');
    successEl.classList.remove('show');

    // Validate email
    if (!email.endsWith('@ishantechnologies.com')) {
        errorEl.textContent = 'Email must be from @ishantechnologies.com domain';
        errorEl.classList.add('show');
        return;
    }

    // Loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        // Refresh session
        const { data: { session }, error: refreshError } = await sb.auth.refreshSession();
        if (refreshError || !session) throw new Error('Session expired. Please login again.');

        // Call edge function
        const response = await fetch(INVITE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                displayName,
                email,
                phone,
                department,
                invitedBy: currentUser?.email || 'admin'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server Error (${response.status})`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText.substring(0, 100);
            }
            throw new Error(errorMessage);
        }

        // Success
        successEl.textContent = `Invitation sent successfully to ${email}!`;
        successEl.classList.add('show');
        document.getElementById('invitationForm').reset();

        // Reload data
        await loadAllData();

    } catch (error) {
        console.error('Invitation Error:', error);
        errorEl.textContent = error.message || 'Failed to send invitation.';
        errorEl.classList.add('show');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// View user details
function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const userIdForProgress = user.n8n_response?.user_id || user.user_id;
    const userProgress = allProgress.filter(p => p.user_id === userIdForProgress);

    const modal = document.getElementById('userModal');
    const modalBody = document.getElementById('userModalBody');

    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 8px;">${user.display_name || 'Unknown'}</h4>
            <p style="color: #64748b;">${user.email}</p>
            ${user.phone ? `<p style="color: #64748b;">${user.phone}</p>` : ''}
            <p style="color: #64748b; font-size: 0.85rem;">Invited: ${new Date(user.created_at).toLocaleDateString()}</p>
        </div>
        <h4 style="margin-bottom: 12px;">Training Progress</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${MODULES.map(m => {
        const progress = userProgress.find(p => p.module_id === m.id);
        const isCompleted = progress?.status === 'completed';
        return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                        <span style="font-size: 1.5rem;">${m.icon}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${m.name}</div>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                ${isCompleted ? `Completed on ${new Date(progress.completed_at).toLocaleDateString()}` : 'Not completed'}
                            </div>
                        </div>
                        ${isCompleted ? `<span class="score-badge">${progress.score || 0} pts</span>` : '<span style="color: #94a3b8;">-</span>'}
                    </div>
                `;
    }).join('')}
        </div>
    `;

    modal.classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('userModal').classList.remove('show');
}

// Resend invite
async function resendInvite(email, displayName) {
    if (!confirm(`Resend invitation to ${email}?`)) return;

    try {
        const { data: { session } } = await sb.auth.refreshSession();
        if (!session) throw new Error('Session expired');

        const response = await fetch(INVITE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                displayName,
                email,
                invitedBy: currentUser?.email || 'admin'
            })
        });

        if (response.ok) {
            alert(`Invitation resent to ${email}`);
            loadAllData();
        } else {
            throw new Error('Failed to resend invitation');
        }
    } catch (error) {
        alert(error.message);
    }
}

// Edit user display name
async function editUser(id, currentName) {
    const newName = prompt('Enter new display name:', currentName);
    if (newName === null || newName === currentName) return;

    if (!newName.trim()) {
        alert('Display name cannot be empty');
        return;
    }

    try {
        // Refresh session to ensure we have latest claims
        await sb.auth.refreshSession();

        // Update invitations table
        const { error: inviteError } = await sb
            .from('invitations')
            .update({ display_name: newName.trim() })
            .eq('id', id);

        if (inviteError) throw inviteError;

        // Sync with Auth User Metadata
        const user = allUsers.find(u => u.id === id);
        const userId = user?.n8n_response?.user_id || user?.user_id;

        if (userId) {
            const { error: authError } = await sb
                .rpc('update_auth_user_name', {
                    user_id_param: userId,
                    new_name: newName.trim()
                });

            if (authError) {
                console.error('Failed to sync with Auth:', authError);
                alert('Saved to dashboard, but failed to sync to Auth: ' + authError.message);
            } else {
                // Success message implies both worked
                // alert('User name updated successfully!'); 
            }
        } else {
            alert('Saved to dashboard. Note: Could not sync to Auth because User ID is missing.');
        }

        // Update local state
        const userIndex = allUsers.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            allUsers[userIndex].display_name = newName.trim();
            filterUsers(); // Re-render table
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user name: ' + error.message);
    }
}

// Export CSV
function exportUsersCSV() {
    const headers = ['Name', 'Email', 'Status', 'Modules Completed', 'Total Score', 'Invited Date'];
    const rows = allUsers.map(user => {
        const userId = user.n8n_response?.user_id || user.user_id;
        const userProgress = allProgress.filter(p => p.user_id === userId);
        const completed = userProgress.filter(p => p.status === 'completed').length;
        const totalScore = userProgress.reduce((acc, p) => acc + (p.score || 0), 0);
        const status = completed > 0 ? 'Active' : 'Pending';

        return [
            user.display_name || '',
            user.email || '',
            status,
            `${completed}/5`,
            totalScore,
            new Date(user.created_at).toLocaleDateString()
        ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Report generation functions
function generateCompletionReport() {
    const headers = ['Name', 'Email', 'Module', 'Score', 'Completed Date'];
    const rows = [];

    allProgress.filter(p => p.status === 'completed').forEach(p => {
        const user = allUsers.find(u => (u.n8n_response?.user_id || u.user_id) === p.user_id);
        const module = MODULES.find(m => m.id === p.module_id);
        rows.push([
            user?.display_name || 'Unknown',
            user?.email || 'Unknown',
            module?.name || p.module_id,
            p.score || 0,
            new Date(p.completed_at).toLocaleDateString()
        ]);
    });

    downloadCSV('completion_report', headers, rows);
}

function generateUserReport() {
    const headers = ['Name', 'Email', 'Status', 'Modules Completed', 'Total Score', 'Last Activity'];
    const rows = allUsers.map(user => {
        const userId = user.n8n_response?.user_id || user.user_id;
        const userProgress = allProgress.filter(p => p.user_id === userId);
        const completed = userProgress.filter(p => p.status === 'completed').length;
        const totalScore = userProgress.reduce((acc, p) => acc + (p.score || 0), 0);
        const lastActivity = userProgress
            .filter(p => p.completed_at)
            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];

        return [
            user.display_name || '',
            user.email || '',
            completed > 0 ? 'Active' : 'Pending',
            `${completed}/5`,
            totalScore,
            lastActivity ? new Date(lastActivity.completed_at).toLocaleDateString() : 'Never'
        ];
    });

    downloadCSV('user_status_report', headers, rows);
}

function generatePendingReport() {
    const headers = ['Name', 'Email', 'Pending Modules', 'Invited Date'];
    const rows = [];

    allUsers.forEach(user => {
        const userId = user.n8n_response?.user_id || user.user_id;
        const userProgress = allProgress.filter(p => p.user_id === userId);
        const completedModules = userProgress.filter(p => p.status === 'completed').map(p => p.module_id);
        const pendingModules = MODULES.filter(m => !completedModules.includes(m.id));

        if (pendingModules.length > 0) {
            rows.push([
                user.display_name || '',
                user.email || '',
                pendingModules.map(m => m.name).join(', '),
                new Date(user.created_at).toLocaleDateString()
            ]);
        }
    });

    downloadCSV('pending_training_report', headers, rows);
}

function generateExpiryReport() {
    const headers = ['Name', 'Email', 'Module', 'Completion Date', 'Expiry Date', 'Days Until Expiry'];
    const rows = [];
    const now = new Date();

    allProgress.filter(p => p.status === 'completed').forEach(p => {
        const completedDate = new Date(p.completed_at);
        const expiryDate = new Date(completedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 90) {
            const user = allUsers.find(u => (u.n8n_response?.user_id || u.user_id) === p.user_id);
            const module = MODULES.find(m => m.id === p.module_id);

            rows.push([
                user?.display_name || 'Unknown',
                user?.email || 'Unknown',
                module?.name || p.module_id,
                completedDate.toLocaleDateString(),
                expiryDate.toLocaleDateString(),
                daysUntilExpiry
            ]);
        }
    });

    rows.sort((a, b) => a[5] - b[5]);
    downloadCSV('expiring_certifications_report', headers, rows);
}

function downloadCSV(filename, headers, rows) {
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility: Time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

// Click outside modal to close
document.getElementById('userModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal();
});

// Auto-refresh every 2 minutes
setInterval(loadAllData, 120000);
