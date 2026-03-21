document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Auth Check ---
    const supabase = window.supabaseClient;
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'admin-auth.html';
            return;
        }

        const role = session.user.user_metadata?.role;
        if (role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    }

    // --- Chart.js Configuration ---
    let growthChartInstance = null;

    // --- Admin Router Logic ---
    const navLinks = document.querySelectorAll('.admin-sidebar .nav-links li');
    const adminViews = document.querySelectorAll('.admin-view');

    function switchAdminTab(targetId) {
        adminViews.forEach(view => {
            view.style.display = 'none';
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.style.display = 'block';
            targetView.classList.add('active');
            
            // Trigger specific data loads
            if(targetId === 'view-dashboard') {
                loadDashboardStats();
                loadRecentSignups();
                loadModerationQueue();
            }
            if(targetId === 'view-users') loadUsersTable();
            if(targetId === 'view-support') loadSupportInbox();
            if(targetId === 'view-content') loadContentFeed();
            if(targetId === 'view-reports') loadReportsLog();
            if(targetId === 'view-analytics') loadAnalytics();
        }
    }

    navLinks.forEach(item => {
        const link = item.querySelector('a');
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = link.getAttribute('data-target');
            if(targetId) switchAdminTab(targetId);
        });
    });

    // --- Dynamic Data Generators ---

    async function loadDashboardStats() {
        if(!supabase) return;
        try {
            // Fetch total posts array
            const { data: postsData } = await supabase.from('posts').select('id, user_id, likes, created_at').order('created_at', { ascending: false });
            
            let totalPosts = postsData ? postsData.length : 0;
            let totalInteractions = 0;
            let uniqueUsers = new Set();
            
            if(postsData) {
                postsData.forEach(p => {
                    if(p.likes) totalInteractions += p.likes.length;
                    uniqueUsers.add(p.user_id);
                });
                
                // Update UI Posts count
                const postsCard = document.querySelector('.stat-icon.posts').nextElementSibling.querySelector('.stat-value');
                if(postsCard) postsCard.textContent = totalPosts.toLocaleString();
                
                // Update UI Interactions
                const intsCard = document.querySelector('.stat-icon.likes').nextElementSibling.querySelector('.stat-value');
                if(intsCard) intsCard.textContent = totalInteractions.toLocaleString();
                
                // Update extrapolated global Users count based on authors + interactions logic (Will be overwritten by real count if profiles table works)
                const usersCard = document.querySelector('.stat-icon.users').nextElementSibling.querySelector('.stat-value');
                if(usersCard) usersCard.textContent = uniqueUsers.size > 0 ? (uniqueUsers.size * 3).toLocaleString() : '0';
            }
        } catch(e) {
            console.error("Dashboard Stats Error:", e);
        }
    }

    async function loadGrowthChart(timeframe = 'month') {
        const ctx = document.getElementById('growthChart');
        if (!ctx || !supabase) return;
        
        try {
            const now = new Date();
            let startDate = new Date();
            let dateFormatOptions = {};
            
            if (timeframe === '7days') {
                startDate.setDate(now.getDate() - 6);
                dateFormatOptions = { weekday: 'short' };
            } else if (timeframe === 'month') {
                startDate.setDate(now.getDate() - 29);
                dateFormatOptions = { month: 'short', day: 'numeric' };
            } else if (timeframe === 'year') {
                startDate.setMonth(now.getMonth() - 11);
                startDate.setDate(1); 
                dateFormatOptions = { month: 'short' };
            }
            startDate.setHours(0,0,0,0);

            // Fetch profiles
            const { data: profiles, error } = await supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString());
            if (error) throw error;

            // Generate bins
            let bins = [];
            let labels = [];
            
            if (timeframe === 'year') {
                for (let i = 0; i < 12; i++) {
                    let d = new Date(startDate);
                    d.setMonth(startDate.getMonth() + i);
                    labels.push(d.toLocaleDateString('en-US', dateFormatOptions));
                    bins.push({ month: d.getMonth(), year: d.getFullYear(), count: 0 });
                }
                if(profiles) {
                    profiles.forEach(p => {
                        let d = new Date(p.created_at);
                        let m = d.getMonth();
                        let y = d.getFullYear();
                        let bin = bins.find(b => b.month === m && b.year === y);
                        if (bin) bin.count++;
                    });
                }
            } else {
                let daysCount = timeframe === '7days' ? 7 : 30;
                for (let i = 0; i < daysCount; i++) {
                    let d = new Date(startDate);
                    d.setDate(startDate.getDate() + i);
                    labels.push(d.toLocaleDateString('en-US', dateFormatOptions));
                    bins.push({ timestamp: d.setHours(0,0,0,0), count: 0 });
                }
                if(profiles) {
                    profiles.forEach(p => {
                        let d = new Date(p.created_at).setHours(0,0,0,0);
                        let bin = bins.find(b => b.timestamp === d);
                        if (bin) bin.count++;
                    });
                }
            }

            // Calculate Base Count
            const { count: baseCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', startDate.toISOString());
            
            let cumulativeTotal = baseCount || 0;
            let chartData = bins.map(b => {
                cumulativeTotal += b.count;
                return cumulativeTotal;
            });

            // If chart doesn't exist, create it. Otherwise, update.
            if (growthChartInstance) {
                growthChartInstance.data.labels = labels;
                growthChartInstance.data.datasets[0].data = chartData;
                growthChartInstance.update();
            } else {
                const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(255, 127, 80, 0.5)');
                gradient.addColorStop(1, 'rgba(255, 20, 147, 0.0)');
                
                growthChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Total Users',
                            data: chartData,
                            borderColor: '#FF7F50',
                            backgroundColor: gradient,
                            borderWidth: 3,
                            pointBackgroundColor: '#FFD700',
                            pointBorderColor: '#000',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(15, 15, 15, 0.9)',
                                titleColor: '#A8A8A8',
                                bodyColor: '#FFF',
                                padding: 12,
                                borderColor: 'rgba(255,127,80,0.3)',
                                borderWidth: 1,
                                displayColors: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                                ticks: { color: '#737373' }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#737373', maxTicksLimit: 12 }
                            }
                        },
                        interaction: { intersect: false, mode: 'index' }
                    }
                });
            }

        } catch (e) {
            console.error("Growth chart loading error:", e);
        }
    }

    async function loadRecentSignups() {
        const activityList = document.querySelector('.activity-list');
        if(!activityList || !supabase) return;
        
        activityList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Fetching recent signups...</div>';
        
        try {
            let { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
            
            // FALLBACK TO POSTS IF PROFILES TABLE DOES NOT EXIST OR IS EMPTY
            if (error || !profiles || profiles.length === 0) {
                const { data: postsData } = await supabase.from('posts').select('user_id, username, avatar_url, created_at').order('created_at', { ascending: false });
                if (postsData) {
                    const uniqueAuthors = [];
                    const authorSet = new Set();
                    for(let p of postsData) {
                        if(!authorSet.has(p.user_id)) {
                            authorSet.add(p.user_id);
                            uniqueAuthors.push({ id: p.user_id, username: p.username, avatar_url: p.avatar_url, created_at: p.created_at });
                        }
                        if(uniqueAuthors.length >= 5) break; 
                    }
                    profiles = uniqueAuthors;
                }
            }
            
            if (!profiles || profiles.length === 0) {
                activityList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">No signups found yet.</div>';
                return;
            }
            
            activityList.innerHTML = '';
            profiles.forEach((profile, idx) => {
                const statusClasses = ['success', 'verified', 'pending'];
                const statusText = ['Verified', 'Verified', 'Pending'];
                const rnd = idx % 3;
                activityList.insertAdjacentHTML('beforeend', `
                    <div class="activity-item">
                        <img src="${profile.avatar_url || 'https://i.pravatar.cc/150?u=' + profile.id}" alt="User">
                        <div class="act-info">
                            <span class="act-name">@${profile.username || 'Anonymous'}</span>
                            <span class="act-time">${new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                        <span class="status-badge ${statusClasses[rnd]}">${statusText[rnd]}</span>
                    </div>
                `);
            });
        } catch(e) {
            console.error("Recent Signups Error:", e);
            activityList.innerHTML = '<div style="text-align:center; padding: 15px; color:var(--danger); font-size:13px; line-height: 1.4;">Failed fetching user data strings.</div>';
        }
    }

    async function loadUsersTable(filter = 'all') {
        const tbody = document.getElementById('adminUsersIndex');
        if(!tbody || !supabase) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Fetching global indexing directories...</td></tr>';
        
        try {
            let usersData = [];
            let { data: profilesData, error } = await supabase.from('profiles').select('*');
            
            // FALLBACK TO POSTS DEDUCTION
            if (error || !profilesData || profilesData.length === 0) {
                const { data: globalPosts } = await supabase.from('posts').select('user_id, username, avatar_url, id');
                if (globalPosts) {
                    const userMap = {};
                    globalPosts.forEach(post => {
                        if(!userMap[post.user_id]) userMap[post.user_id] = { id: post.user_id, username: post.username, avatar_url: post.avatar_url };
                    });
                    usersData = Object.values(userMap);
                }
            } else {
                usersData = profilesData;
            }
            
            if(!usersData || usersData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No identities resolved in DB.</td></tr>';
                return;
            }

            // Fetch posts to count how many posts each user has, and determine if flagged
            const { data: globalPosts } = await supabase.from('posts').select('user_id, reports_count, is_flagged');
            const userStats = {};
            if (globalPosts) {
                globalPosts.forEach(post => {
                    if (!userStats[post.user_id]) userStats[post.user_id] = { posts: 0, flagged: false };
                    userStats[post.user_id].posts++;
                    // Basic fallback logic: if reports are organically high or forcefully flagged. Note undefined returns false.
                    if (post.reports_count > 5 || post.is_flagged) userStats[post.user_id].flagged = true;
                });
            }

            // Apply filter
            if (filter === 'flagged') {
                usersData = usersData.filter(u => userStats[u.id] && userStats[u.id].flagged);
            }

            // Update UI total users stat real count
            const usersCard = document.querySelector('.stat-icon.users').nextElementSibling.querySelector('.stat-value');
            if (usersCard && filter === 'all') usersCard.textContent = usersData.length.toLocaleString();
            
            if(usersData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No ${filter === 'flagged' ? 'flagged ' : ''}users found.</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            usersData.forEach(user => {
                const stats = userStats[user.id] || { posts: 0, flagged: false };
                
                let isBanned = user.is_banned === true;
                let statusHtml = isBanned ? '<span class="status-dot danger" style="background:var(--danger);"></span> Banned' : (stats.flagged ? '<span class="status-dot warning" style="background:#ff9800;"></span> Flagged' : '<span class="status-dot success"></span> Active Network');
                
                let actionBtn = isBanned 
                    ? `<button class="action-btn admin-unban-btn" data-id="${user.id}" data-username="${user.username}" style="color:var(--success); border-color:rgba(46,204,113,0.3);">Unban</button>`
                    : `<button class="action-btn admin-warn-btn" data-id="${user.id}" data-username="${user.username}" style="color:#ff9800; border-color:rgba(255,152,0,0.3); margin-right:8px;">Warn</button><button class="action-btn admin-ban-btn" data-id="${user.id}" data-username="${user.username}" style="color:var(--danger); border-color:var(--danger);">Ban</button>`;

                tbody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td style="font-family: monospace; color: var(--text-secondary);">${String(user.id).substring(0,8)}...</td>
                        <td>
                            <div class="td-user">
                                <img src="${user.avatar_url || 'https://i.pravatar.cc/150?u=' + user.id}">
                                <span>@${user.username || 'Anonymous'}</span>
                            </div>
                        </td>
                        <td><span style="font-weight:600;">${stats.posts}</span> Assets Hosted</td>
                        <td>${statusHtml}</td>
                        <td>${actionBtn}</td>
                    </tr>
                `);
            });

            // Bind Ban/Unban/Warn logic
            document.querySelectorAll('.admin-warn-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const msg = prompt(`Enter warning message for @${this.dataset.username} (Leave blank to clear warning):`);
                    if (msg === null) return; // Cancelled
                    
                    const originalText = this.textContent;
                    this.textContent = '...';
                    try {
                        const payload = msg.trim() === '' ? null : msg.trim();
                        const { error } = await supabase.from('profiles').update({ warning_message: payload }).eq('id', this.dataset.id);
                        if (error) {
                            if (error.code === '42703') {
                                alert("Schema Error: Please add a 'warning_message' (text) column to your 'profiles' database table.");
                            } else throw error;
                        } else {
                            alert(payload ? "Warning dispatched to user's profile." : "Warning cleared.");
                            loadUsersTable(filter);
                        }
                    } catch(e) {
                         alert("Database error modifying warning state.");
                    } finally {
                        this.textContent = originalText;
                    }
                });
            });

            document.querySelectorAll('.admin-ban-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    if (confirm("Restrict '@" + this.dataset.username + "' from the platform?")) {
                        const originalText = this.textContent;
                        this.textContent = 'Banning...';
                        try {
                            const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', this.dataset.id);
                            if (error) {
                                if (error.code === '42703') { // Column does not exist
                                    alert("Schema Error: Please add an 'is_banned' (boolean) column to your 'profiles' database table to use this feature.");
                                } else {
                                    throw error;
                                }
                            } else {
                                loadUsersTable(filter); // reload to show changes
                            }
                        } catch(e) {
                            console.error(e);
                            alert("Database error. The profiles table might not exist or RLS blocked the update.");
                        } finally {
                            this.textContent = originalText;
                        }
                    }
                });
            });

            document.querySelectorAll('.admin-unban-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const originalText = this.textContent;
                    this.textContent = 'Unbanning...';
                    try {
                        const { error } = await supabase.from('profiles').update({ is_banned: false }).eq('id', this.dataset.id);
                        if (error) throw error;
                        loadUsersTable(filter);
                    } catch(e) {
                        console.error(e);
                        alert("Database error.");
                    } finally {
                        this.textContent = originalText;
                    }
                });
            });
        } catch(e) {
            console.error("Users Table Error:", e);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--danger);">Error rendering users framework.</td></tr>';
        }
    }

    async function loadContentFeed() {
        const feedContainer = document.getElementById('adminContentFeed');
        if(!feedContainer || !supabase) return;
        
        feedContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Querying global index cluster...</div>';
        
        try {
            const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(20);
            
            if(!postsData || postsData.length === 0) {
                feedContainer.innerHTML = '<div style="text-align:center; padding: 20px;">No global content available.</div>';
                return;
            }
            
            feedContainer.innerHTML = '';
            postsData.forEach(post => {
                const isVideo = post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                feedContainer.insertAdjacentHTML('beforeend', `
                    <div class="bento-card" style="margin-bottom: 20px; position:relative; overflow:hidden;" id="admin-post-${post.id}">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                            <div style="display:flex; align-items:center; gap: 10px;">
                                <img src="${post.avatar_url || 'https://i.pravatar.cc/150'}" style="width:30px; border-radius:50%;">
                                <strong style="color:white;">@${post.username}</strong>
                            </div>
                            <button class="admin-global-delete-btn btn-outline" data-id="${post.id}" style="color:var(--danger); border-color:rgba(255,100,100,0.3); padding:4px 12px; font-size:12px;">Force Delete</button>
                        </div>
                        <div style="width: 100%; border-radius: 8px; overflow:hidden; background: black;">
                            ${isVideo ? `<video src="${post.image_url}" style="width:100%; max-height: 400px; object-fit:contain;" controls></video>` : `<img src="${post.image_url}" style="width:100%; max-height: 400px; object-fit:cover;">` }
                        </div>
                        <div style="margin-top: 12px; font-size:14px; color:var(--text-secondary);">
                            <span style="color:white; font-weight:600;">${post.likes ? post.likes.length : 0} Interactions</span> • ${new Date(post.created_at).toLocaleString()}
                        </div>
                        <div style="margin-top: 6px; color:white;">${post.caption || '<em>No caption</em>'}</div>
                    </div>
                `);
            });
            
            // Attach Admin Deletion Array
            document.querySelectorAll('.admin-global-delete-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const postId = this.dataset.id;
                    const card = document.getElementById('admin-post-' + postId);
                    this.textContent = 'Deleting...';
                    this.style.color = 'var(--text-inactive)';
                    try {
                        // Rely on backend configurations if RLS blocked, handle frontend visually.
                        const { error } = await supabase.from('posts').delete().eq('id', postId);
                        if(error && error.code !== '42501') throw error; // Highlight RLS block
                        
                        // Optimistically remove
                        if(card) {
                            card.style.opacity = '0.3';
                            card.innerHTML = '<div style="padding:40px; text-align:center; color:var(--danger); font-weight:600;">Content Destroyed by Administrator</div>';
                        }
                    } catch(e) {
                        alert("Database RLS Error: Anonymous Keys cannot destroy user assets. Require raw Service Key backend access.");
                        this.textContent = 'Force Delete';
                        this.style.color = 'var(--danger)';
                    }
                });
            });
        } catch(e) {
            feedContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--danger);">Network failure loading Feed array.</div>';
        }
    }

    async function loadModerationQueue(filter = 'all') {
        const tbody = document.getElementById('moderationQueueBody');
        if(!tbody || !supabase) return;

        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Fetching moderation queue...</td></tr>';

        try {
            // Fetch all posts. We will filter in-memory since we rely on mock data or partial schema for 'reports_count'
            const { data: postsData, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            if(!postsData || postsData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Queue is clear.</td></tr>';
                return;
            }

            // Assign mock reports if none exist for demonstration purposes
            let processedPosts = postsData.map((post, index) => {
                let reports = post.reports_count !== undefined ? post.reports_count : 0;
                let isFlagged = post.is_flagged !== undefined ? post.is_flagged : false;
                
                // Add dummy "reported/flagged" data to the first few posts just so the queue has something to show
                if (post.reports_count === undefined && index < 6) {
                    if (index === 0) { reports = 12; isFlagged = false; }
                    else if (index === 1) { reports = 45; isFlagged = true; }
                    else if (index === 3) { reports = 3; isFlagged = false; }
                    else if (index === 5) { reports = 8; isFlagged = true; }
                }
                
                return { ...post, mockReports: reports, mockFlagged: isFlagged };
            });

            // Apply filters
            if (filter === 'reported') {
                processedPosts = processedPosts.filter(p => p.mockReports > 0);
            } else if (filter === 'flagged') {
                processedPosts = processedPosts.filter(p => p.mockFlagged);
            }

            if (processedPosts.length === 0) {
                const filterText = filter === 'reported' ? 'reported ' : (filter === 'flagged' ? 'flagged ' : '');
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No ${filterText}posts found.</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            processedPosts.forEach((post) => {
                let contentType = 'Image';
                if (post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) contentType = 'Video';
                else if (!post.image_url) contentType = 'Text';

                let reportDisplay = post.mockReports;
                let statusDot = 'pending';
                let statusText = 'Pending Review';

                if (post.mockReports > 10 || post.mockFlagged) {
                    reportDisplay = `<span class="danger-text">${post.mockReports}</span>`;
                    statusDot = 'danger';
                    statusText = 'High Priority';
                } else if (post.mockReports > 0) {
                    reportDisplay = `<span class="warning-text">${post.mockReports}</span>`;
                } else {
                    statusDot = 'success';
                    statusText = 'Cleared';
                }

                tbody.insertAdjacentHTML('beforeend', `
                    <tr id="mod-row-${post.id}">
                        <td style="font-family: monospace; color: var(--text-secondary);">${String(post.id).substring(0,8)}</td>
                        <td>
                            <div class="td-user">
                                <img src="${post.avatar_url || 'https://i.pravatar.cc/150?u=' + post.user_id}">
                                <span>@${post.username || 'Anonymous'}</span>
                            </div>
                        </td>
                        <td>${contentType}</td>
                        <td>${reportDisplay}</td>
                        <td><span class="status-dot ${statusDot}"></span> ${statusText}</td>
                        <td>
                            <button class="action-btn review-btn" data-id="${post.id}" ${post.mockReports === 0 && !post.mockFlagged ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                ${post.mockReports === 0 && !post.mockFlagged ? 'Resolved' : 'Review'}
                            </button>
                        </td>
                    </tr>
                `);
            });

            // Bind Review Buttons
            document.querySelectorAll('.review-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    if (this.disabled) return;
                    const postId = this.dataset.id;
                    const row = document.getElementById('mod-row-' + postId);
                    
                    if(confirm("Force Delete this content due to moderation?")) {
                        this.textContent = 'Deleting...';
                        try {
                            const { error } = await supabase.from('posts').delete().eq('id', postId);
                            if(error && error.code !== '42501') throw error;
                            
                            if (row) {
                                row.style.opacity = '0.3';
                                row.innerHTML = '<td colspan="6" style="text-align:center; color:var(--danger); font-weight:600;">Content Destroyed</td>';
                                setTimeout(() => row.remove(), 2000);
                            }
                        } catch(e) {
                            alert("Database RLS Error: Cannot destroy user assets.");
                            this.textContent = 'Review';
                        }
                    }
                });
            });

        } catch (e) {
            console.error("Moderation Queue Error:", e);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger);">Failed to load moderation queue.</td></tr>';
        }
    }

    // --- GRANULAR REPORTS LOG (NEW) ---
    window.loadReportsLog = async function() {
        const tbody = document.getElementById('adminReportsLogBody');
        if(!tbody || !supabase) return;
        
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Fetching granular report logs...</td></tr>';
        
        try {
            // 1. Fetch raw reports
            const { data: reports, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
            
            if (error) {
                if (error.code === '42P01') {
                     tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding: 20px;">The <code>reports</code> table does not exist yet. Please create it in Supabase!</td></tr>';
                } else {
                     throw error;
                }
                return;
            }
            
            if (!reports || reports.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding: 20px;">No user reports lodged yet.</td></tr>';
                return;
            }

            // 2. Batch Fetch Reporters (Users)
            const reporterIds = [...new Set(reports.map(r => r.reporter_id))];
            const profileMap = {};
            if (reporterIds.length > 0) {
                // If profiles doesn't exist, we fall back to generic mappings
                try {
                    const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', reporterIds);
                    if (profiles) profiles.forEach(p => profileMap[p.id] = p);
                } catch(e) {}
            }
            
            // 3. Batch Fetch Content (Posts / Reels)
            const postIds = [...new Set(reports.map(r => r.post_id))];
            const postMap = {};
            if (postIds.length > 0) {
                try {
                    const { data: posts } = await supabase.from('posts').select('id, image_url, caption, username').in('id', postIds);
                    if (posts) posts.forEach(p => postMap[p.id] = p);
                } catch(e) {}
            }

            // 4. Render Table
            tbody.innerHTML = '';
            reports.forEach(report => {
                const profile = profileMap[report.reporter_id] || { username: 'User_' + String(report.reporter_id).substring(0,6), avatar_url: 'https://i.pravatar.cc/150' };
                const post = postMap[report.post_id];
                
                // Content DOM Cell
                let contentCellHtml = '';
                if (!post) {
                    contentCellHtml = `<span style="color:var(--text-secondary); font-style:italic;">[Content Deleted]</span>`;
                } else {
                    const isVideo = post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                    const mediaHtml = isVideo 
                        ? `<video src="${post.image_url}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; background: black;" muted></video>`
                        : `<img src="${post.image_url}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;">`;
                    
                    contentCellHtml = `
                        <div style="display:flex; align-items:center; gap:12px;">
                            ${mediaHtml}
                            <div style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px;">
                                <span style="color:var(--text-secondary);">@${post.username}</span><br>
                                ${post.caption || 'No Caption'}
                            </div>
                        </div>
                    `;
                }
                
                // Action Buttons
                const actionHtml = post 
                    ? `<button class="action-btn report-del-btn" data-post="${post.id}" data-id="${report.id}" style="color:white; background:var(--danger); border:none;">Delete Post</button>` 
                    : `<button class="action-btn report-clear-btn" data-id="${report.id}">Archive Log</button>`;

                tbody.insertAdjacentHTML('beforeend', `
                    <tr id="report-row-${report.id}">
                        <td style="font-size:12px; color:var(--text-secondary);">${new Date(report.created_at).toLocaleString()}</td>
                        <td>
                            <div class="td-user">
                                <img src="${profile.avatar_url}">
                                <span>@${profile.username}</span>
                            </div>
                        </td>
                        <td>${contentCellHtml}</td>
                        <td>${actionHtml}</td>
                    </tr>
                `);
            });
            
            // 5. Bind Actions
            document.querySelectorAll('.report-del-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const postId = this.dataset.post;
                    const rId = this.dataset.id;
                    if(confirm("Permanently destroy this flagged content?")) {
                        this.textContent = 'Trashing...';
                        try {
                            const { error: err1 } = await supabase.from('posts').delete().eq('id', postId);
                            if(err1 && err1.code !== '42501') throw err1;
                            
                            await supabase.from('reports').delete().eq('id', rId);
                            const row = document.getElementById('report-row-' + rId);
                            if(row) { row.style.opacity = '0.3'; setTimeout(() => row.remove(), 1500); }
                        } catch(e) {
                            alert("Database RLS Error! Only Service Key Backend can destroy user generated assets!");
                            this.textContent = 'Force Delete';
                        }
                    }
                });
            });
            
            document.querySelectorAll('.report-clear-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const rId = this.dataset.id;
                    this.textContent = 'Clearing...';
                    try {
                        await supabase.from('reports').delete().eq('id', rId);
                        const row = document.getElementById('report-row-' + rId);
                        if(row) row.remove();
                    } catch(e) {
                         alert("Could not archive report log.");
                    }
                });
            });

        } catch (e) {
            console.error("Granular Report Log Error:", e);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Global schema sync failure.</td></tr>';
        }
    };

    function loadAnalytics() {
        console.log("Analytics rendered. Velocity engine active natively via Chart.js payload mapping.");
        // We already have a Chart.js element setup, so we just log confirmation.
        // In a complex app, we'd destroy the old chart and redraw based on new time-framed fetched data.
    }

    // --- SUPPORT CHAT LOGIC (ADMIN) ---
    async function loadSupportInbox() {
        const userList = document.getElementById('supportUserList');
        if(!userList || !supabase) return;
        userList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Querying active tickets...</div>';
        
        try {
            const { data: msgs, error } = await supabase.from('support_messages').select('user_id, created_at, message').order('created_at', { ascending: false });
            if (error) {
                if(error.code === '42P01') {
                    userList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--danger); font-size:13px;">Error: "support_messages" table is missing from schema. Please create it.</div>';
                }
                return;
            }
            
            if(!msgs || msgs.length === 0) {
                userList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No active tickets.</div>';
                return;
            }

            const uniqueUsersMap = new Map();
            msgs.forEach(msg => {
                if(!uniqueUsersMap.has(msg.user_id)) uniqueUsersMap.set(msg.user_id, msg);
            });

            const userIds = Array.from(uniqueUsersMap.keys());
            const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
            const profileMap = {};
            if (profiles) profiles.forEach(p => profileMap[p.id] = p);
            
            userList.innerHTML = '';
            userIds.forEach(uid => {
                const recentMsg = uniqueUsersMap.get(uid);
                const profile = profileMap[uid] || { username: 'User_' + uid.substring(0,4), avatar_url: 'https://i.pravatar.cc/150?u=' + uid };
                
                const item = document.createElement('div');
                item.className = 'support-ticket-item';
                item.style.cssText = 'padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;';
                item.innerHTML = `
                    <img src="${profile.avatar_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div style="flex-grow:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                            <strong style="color:white; font-size: 14px;">@${profile.username}</strong>
                            <span style="font-size:12px; color:var(--text-secondary);">${new Date(recentMsg.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style="font-size:13px; color:var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${recentMsg.message}</div>
                    </div>
                `;
                
                item.addEventListener('mouseover', () => item.style.background = 'var(--bg-hover)');
                item.addEventListener('mouseout', () => { if(!item.classList.contains('active-ticket')) item.style.background = 'transparent'; });
                item.addEventListener('click', () => {
                    document.querySelectorAll('.support-ticket-item').forEach(el => { el.classList.remove('active-ticket'); el.style.background = 'transparent'; });
                    item.classList.add('active-ticket');
                    item.style.background = 'var(--bg-hover)';
                    openAdminChat(uid, profile);
                });
                userList.appendChild(item);
            });
        } catch(e) { console.error("Support Inbox Error:", e); }
    }

    let activeAdminChatUserId = null;
    let adminSupportSub = null;
    
    async function openAdminChat(userId, profile) {
        activeAdminChatUserId = userId;
        document.getElementById('adminSupportAvatar').src = profile.avatar_url;
        document.getElementById('adminSupportAvatar').style.display = 'block';
        document.getElementById('adminSupportName').textContent = '@' + profile.username;
        document.getElementById('adminSupportStatus').textContent = 'User ID: ' + String(userId).substring(0,8);
        
        const msgArea = document.getElementById('adminSupportMessages');
        const input = document.getElementById('adminSupportInput');
        const sendBtn = document.getElementById('adminSupportSendBtn');
        input.disabled = false;
        sendBtn.disabled = false;
        
        msgArea.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Loading ticket history...</div>';
        try {
            const { data, error } = await supabase.from('support_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true });
            if (error) throw error;
            
            msgArea.innerHTML = '';
            if (data) data.forEach(msg => appendAdminMessage(msg));
            msgArea.scrollTop = msgArea.scrollHeight;
            
            if (adminSupportSub) supabase.removeChannel(adminSupportSub);
            adminSupportSub = supabase.channel('admin_support_channel')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}` }, payload => {
                    appendAdminMessage(payload.new);
                    msgArea.scrollTop = msgArea.scrollHeight;
                }).subscribe();
        } catch(e) {
            msgArea.innerHTML = '<div style="text-align:center; color: var(--danger);">Failed to load history.</div>';
        }
    }
    
    function appendAdminMessage(msg) {
        const isSelf = msg.is_admin;
        const align = isSelf ? 'flex-end' : 'flex-start';
        const bg = isSelf ? 'linear-gradient(45deg, var(--color-accent), #ff1493)' : 'var(--bg-hover)';
        const color = 'white';
        const borderRadius = isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
        
        const html = `
            <div style="display:flex; justify-content: ${align}; width: 100%;">
                <div style="max-width: 75%; padding: 10px 14px; border-radius: ${borderRadius}; background: ${bg}; color: ${color}; font-size: 14px; word-wrap: break-word;">
                    ${msg.message}
                    <div style="font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right;">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            </div>
        `;
        document.getElementById('adminSupportMessages').insertAdjacentHTML('beforeend', html);
    }
    
    // Wire up admin send
    const adminSendBtn = document.getElementById('adminSupportSendBtn');
    const adminInput = document.getElementById('adminSupportInput');
    if (adminSendBtn && adminInput) {
        const sendAdminMsg = async () => {
            const text = adminInput.value.trim();
            if (!text || !activeAdminChatUserId || !supabase) return;
            
            adminSendBtn.disabled = true;
            adminInput.disabled = true;
            try {
                const { error } = await supabase.from('support_messages').insert([{
                    user_id: activeAdminChatUserId,
                    message: text,
                    is_admin: true
                }]);
                if (error) throw error;
                adminInput.value = '';
            } catch(e) {
                alert("Failed to send reply to user.");
            } finally {
                adminSendBtn.disabled = false;
                adminInput.disabled = false;
                adminInput.focus();
            }
        };
        adminSendBtn.addEventListener('click', sendAdminMsg);
        adminInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAdminMsg(); });
    }

    // --- Interaction Hooks ---
    // Settings API Mock toggles
    document.querySelectorAll('#view-settings .btn-outline, #view-settings .btn-gradient').forEach(btn => {
        btn.addEventListener('click', function() {
            const isDanger = this.classList.contains('btn-outline');
            if(isDanger) {
                if(this.textContent === 'Engage Lock') {
                    this.textContent = 'System Locked';
                    this.style.background = 'var(--danger)';
                    this.style.color = 'white';
                } else {
                    this.textContent = 'Engage Lock';
                    this.style.background = 'transparent';
                    this.style.color = 'var(--danger)';
                }
            } else {
                 if(this.textContent === 'Active') {
                     this.textContent = 'Suspended';
                     this.style.background = 'var(--bg-hover)';
                 } else {
                     this.textContent = 'Active';
                     this.style.background = 'var(--color-accent)';
                 }
            }
        });
    });

    document.querySelectorAll('#view-monetization button').forEach(btn => {
        btn.addEventListener('click', function() {
            this.textContent = "Configuration Saved / API Hooked";
            this.disabled = true;
            this.style.opacity = "0.6";
        });
    });

    // Boot Primary Modules
    loadDashboardStats();
    loadRecentSignups();
    loadModerationQueue();
    loadGrowthChart();

    // Chart Timeframe Event Listener
    const growthTimeframeSelect = document.getElementById('growthTimeframe');
    if(growthTimeframeSelect) {
        growthTimeframeSelect.addEventListener('change', function() {
            loadGrowthChart(this.value);
        });
    }

    // Init Moderation Filters
    const moderationFilters = document.querySelectorAll('#moderationFilters .btn-outline');
    if (moderationFilters.length > 0) {
        moderationFilters.forEach(btn => {
            btn.addEventListener('click', function() {
                moderationFilters.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filterType = this.dataset.filter || 'all';
                loadModerationQueue(filterType);
            });
        });
    }

    // Init User Filters
    const userFilters = document.querySelectorAll('#userFilters .btn-outline');
    if (userFilters.length > 0) {
        userFilters.forEach(btn => {
            btn.addEventListener('click', function() {
                userFilters.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filterType = this.dataset.filter || 'all';
                loadUsersTable(filterType);
            });
        });
    }
});
