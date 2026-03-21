document.addEventListener('DOMContentLoaded', async () => {
    // --- SPLASH SCREEN ---
    window.addEventListener('load', () => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 500);
            }, 1200); // Overlay display duration
        }
    });

    const supabase = window.supabaseClient;
    
    // --- AUTH CHECK ---
    if (!supabase) {
        console.error("Supabase config required.");
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // Redirect to login if not authenticated
        window.location.href = 'auth.html';
        return;
    }

    if (session.user.user_metadata?.role === 'admin') {
        // Redirect admins to their dashboard
        window.location.href = 'admin.html';
        return;
    }

    const currentUser = session.user;
    const username = currentUser.user_metadata?.username || currentUser.email.split('@')[0];
    const userAvatar = currentUser.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${username}`;

    // Update UI for current user
    const avatarEl = document.getElementById('currentUserAvatar');
    if (avatarEl) avatarEl.src = userAvatar;
    
    // Also update right sidebar profile user if it exists in DOM
    const rightSidebarProfileImg = document.querySelector('.current-user img');
    const rightSidebarProfileName = document.querySelector('.current-user .username');
    if (rightSidebarProfileImg) rightSidebarProfileImg.src = userAvatar;
    if (rightSidebarProfileName) rightSidebarProfileName.textContent = username;

    // --- SINGLE PAGE APPLICATION NAVIGATION ---
    const navLinks = {
        'nav-home': 'view-home',
        'nav-search': 'view-search',
        'nav-explore': 'view-explore',
        'nav-reels': 'view-reels',
        'nav-messages': 'view-messages',
        'nav-notifications': 'view-notifications',
        'nav-profile': 'view-profile'
    };

    function navigateTo(navId) {
        // Remove active class from all nav items
        Object.keys(navLinks).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });

        // Hide all views
        Object.values(navLinks).forEach(viewId => {
            const el = document.getElementById(viewId);
            if (el) el.classList.remove('active');
        });

        // Activate selected
        const navEl = document.getElementById(navId);
        if (navEl) navEl.classList.add('active');

        const viewId = navLinks[navId];
        const viewEl = document.getElementById(viewId);
        if (viewEl) viewEl.classList.add('active');

        // Handle right sidebar visibility
        const rightSidebar = document.querySelector('.right-sidebar');
        if (rightSidebar) {
            if (viewId === 'view-home') {
                rightSidebar.style.display = '';
            } else {
                rightSidebar.style.display = 'none';
            }
        }

        // Handle specific view logic
        if (viewId === 'view-profile') {
            loadProfileView();
        } else if (viewId === 'view-explore') {
            if (typeof loadExploreView === 'function') loadExploreView();
        } else if (viewId === 'view-reels') {
            if (typeof loadReelsView === 'function') loadReelsView();
        } else if (viewId === 'view-messages') {
            loadMessagesView();
        }

        // Global polling cleanup for Chat when leaving Messages
        if (typeof handleViewChangeForChat === 'function') {
            handleViewChangeForChat();
        }
    }

    // Attach listeners
    Object.keys(navLinks).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(id);
            });
        }
    });

    // --- PROFILE VIEW LOGIC ---
    async function loadProfileView() {
        const usernameEl = document.getElementById('profileViewUsername');
        const countEl = document.getElementById('profilePostCount');
        const gridEl = document.getElementById('profileGrid');
        const loadingEl = document.getElementById('profileLoading');
        const emptyEl = document.getElementById('profileEmpty');
        const avatarEl = document.getElementById('profileViewAvatar');

        if(usernameEl) usernameEl.textContent = username;
        if(avatarEl) avatarEl.src = userAvatar;

        // Fetch User Profile Data for Warnings
        try {
            const { data: profileData } = await window.supabaseClient.from('profiles').select('warning_message').eq('id', currentUser.id).single();
            const warningBanner = document.getElementById('profileWarningBanner');
            const warningText = document.getElementById('profileWarningText');
            if (profileData && profileData.warning_message) {
                if (warningBanner && warningText) {
                    warningText.innerHTML = "<strong>Admin Notice:</strong> " + profileData.warning_message;
                    warningBanner.style.display = 'block';
                }
            } else if (warningBanner) {
                warningBanner.style.display = 'none';
            }
        } catch(e) {
            console.log("No profile warning data found.");
        }

        // Sync Follower Stats
        try {
            const { count: followersCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', currentUser.id);
            const follEl = document.getElementById('profileFollowersCount');
            if(follEl) follEl.textContent = followersCount || 0;

            const { count: followingCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', currentUser.id);
            const followingEl = document.getElementById('profileFollowingCount');
            if(followingEl) followingEl.textContent = followingCount || 0;
        } catch(followErr) {
            console.log("Follows table missing", followErr);
        }

        // Setup Tabs
        const tabPosts = document.getElementById('profileTabPosts');
        const tabSaved = document.getElementById('profileTabSaved');
        const tabTagged = document.getElementById('profileTabTagged');
        const allTabs = [tabPosts, tabSaved, tabTagged];

        function switchTab(activeTab) {
            allTabs.forEach(t => {
                if(!t) return;
                t.style.borderTop = '1px solid transparent';
                t.style.color = 'var(--text-secondary)';
                const icon = t.querySelector('i');
                if(icon) {
                    icon.classList.remove('ph-fill');
                    icon.classList.add('ph');
                }
            });
            if(activeTab) {
                activeTab.style.borderTop = '1px solid white';
                activeTab.style.color = 'white';
                const activeIcon = activeTab.querySelector('i');
                if(activeIcon) {
                    activeIcon.classList.remove('ph');
                    activeIcon.classList.add('ph-fill');
                }
            }
        }

        async function fetchAndRender(tabName) {
            gridEl.innerHTML = '';
            loadingEl.style.display = 'block';
            emptyEl.style.display = 'none';
            
            try {
                let postsToRender = [];
                
                if (tabName === 'posts') {
                    const { data, error } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('user_id', currentUser.id)
                        .order('created_at', { ascending: false });
                    if(error) throw error;
                    postsToRender = data || [];
                    if(countEl) countEl.textContent = postsToRender.length;
                } 
                else if (tabName === 'saved') {
                    const { data: savedData, error: savedErr } = await supabase
                        .from('saved_posts')
                        .select('post_id')
                        .eq('user_id', currentUser.id);
                        
                    if(savedErr) throw savedErr;
                    
                    if(savedData && savedData.length > 0) {
                        const postIds = savedData.map(s => s.post_id);
                        const { data, error } = await supabase
                            .from('posts')
                            .select('*')
                            .in('id', postIds)
                            .order('created_at', { ascending: false });
                        if(error) throw error;
                        postsToRender = data || [];
                    }
                } 
                else if (tabName === 'tagged') {
                    const tagString = `%@${currentUser.user_metadata.username || currentUser.email.split('@')[0]}%`;
                    const { data, error } = await supabase
                        .from('posts')
                        .select('*')
                        .ilike('caption', tagString)
                        .order('created_at', { ascending: false });
                    if(error) throw error;
                    postsToRender = data || [];
                }

                loadingEl.style.display = 'none';

                if (postsToRender.length === 0) {
                    emptyEl.style.display = 'block';
                    const iconEl = emptyEl.querySelector('i');
                    const titleEl = emptyEl.querySelector('h3');
                    if(iconEl && titleEl) {
                        if(tabName === 'posts') { iconEl.className = 'ph ph-camera'; titleEl.textContent = 'No Posts Yet'; }
                        if(tabName === 'saved') { iconEl.className = 'ph ph-bookmark-simple'; titleEl.textContent = 'No Saved Posts'; }
                        if(tabName === 'tagged') { iconEl.className = 'ph ph-user-square'; titleEl.textContent = 'No Tagged Posts'; }
                    }
                    return;
                }

                postsToRender.forEach(post => {
                    const isOwnPost = post.user_id === currentUser.id;
                    const deleteBtnHtml = isOwnPost 
                        ? `<div class="profile-delete-post" data-id="${post.id}" style="background: rgba(0,0,0,0.7); border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center; z-index: 5; margin-top: 10px;">
                               <i class="ph ph-trash" style="color: var(--color-accent); font-size: 20px;"></i>
                           </div>` : '';

                    const item = `
                        <div style="aspect-ratio: 1; overflow: hidden; position: relative; cursor: pointer;" class="profile-grid-item" data-id="${post.id}">
                            ${post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
                                ? `<video src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>
                                   <i class="ph-fill ph-video-camera" style="position:absolute; top:8px; right:8px; color:white; font-size:20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);"></i>`
                                : `<img src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;">`
                            }
                            <div class="grid-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; gap:16px;">
                                <span style="color:white; font-weight:600; display:flex; align-items:center; gap:6px;"><i class="ph-fill ph-heart"></i> ${post.likes ? post.likes.length : 0}</span>
                                ${deleteBtnHtml}
                            </div>
                        </div>
                    `;
                    gridEl.insertAdjacentHTML('beforeend', item);
                });
                
                // Add hover effect
                document.querySelectorAll('.profile-grid-item').forEach(item => {
                    item.addEventListener('mouseenter', () => item.querySelector('.grid-overlay').style.opacity = '1');
                    item.addEventListener('mouseleave', () => item.querySelector('.grid-overlay').style.opacity = '0');
                });
                
                // Add profile-delete binding
                document.querySelectorAll('.profile-delete-post').forEach(btn => {
                    btn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        if(!confirm("Are you sure you want to delete this post?")) return;
                        const postId = this.dataset.id;
                        this.closest('.profile-grid-item').remove();
                        try {
                            await supabase.from('posts').delete().eq('id', postId);
                            if(countEl && tabName === 'posts') countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
                        } catch(err) { console.error("Error deleting", err); }
                    });
                });

            } catch(e) {
                loadingEl.style.display = 'none';
                console.error(`Error loading profile tab ${tabName}`, e);
            }
        }

        if(tabPosts) tabPosts.onclick = () => { switchTab(tabPosts); fetchAndRender('posts'); };
        if(tabSaved) tabSaved.onclick = () => { switchTab(tabSaved); fetchAndRender('saved'); };
        if(tabTagged) tabTagged.onclick = () => { switchTab(tabTagged); fetchAndRender('tagged'); };

        if(tabPosts) switchTab(tabPosts);
        fetchAndRender('posts');
    }

    // --- REELS VIEW LOGIC ---
    async function loadReelsView() {
        const reelsView = document.getElementById('view-reels');
        if (!reelsView) return;
        
        reelsView.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading reels...</div>';
        
        try {
            // Fetch all posts from DB
            const { data: allPosts, error } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Filter only videos based on extension
            const videoPosts = allPosts.filter(post => 
                post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
            );
            
            if (videoPosts.length === 0) {
                reelsView.style.height = 'auto'; // Reset styles
                reelsView.style.overflowY = 'visible';
                reelsView.innerHTML = `
                    <div style="height: calc(100vh - 40px); background: #111; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
                        <i class="ph ph-video-camera" style="font-size: 64px; margin-bottom: 16px; color: rgba(255,255,255,0.5);"></i>
                        <h3>No Reels Yet</h3>
                        <p style="color: var(--text-secondary);">Upload a video to see it here!</p>
                    </div>`;
                return;
            }
            
            // Setup strict styling for the snap-scroll container
            let savedSet = new Set();
            try {
                const { data: savedData } = await supabase.from('saved_posts').select('post_id').eq('user_id', currentUser.id);
                if(savedData) savedData.forEach(d => savedSet.add(d.post_id));
            } catch(e) {}

            reelsView.style.height = 'calc(100vh - 40px)';
            reelsView.style.overflowY = 'scroll';
            reelsView.style.scrollSnapType = 'y mandatory';
            reelsView.style.scrollBehavior = 'smooth';
            // Hide scrollbars cross-browser
            reelsView.style.msOverflowStyle = 'none';
            reelsView.style.scrollbarWidth = 'none';
            
            reelsView.innerHTML = `
                <style>
                    #view-reels::-webkit-scrollbar { display: none; }
                </style>
            `;
            
            videoPosts.forEach(post => {
                const isLiked = post.likes && post.likes.includes(currentUser.id);
                const likeCount = post.likes ? post.likes.length : 0;
                const heartClass = isLiked ? 'ph-fill liked' : 'ph';

                const isOwnPost = post.user_id === currentUser.id;
                const deletePostHtml = isOwnPost 
                    ? `<div class="reel-delete-post-btn" data-id="${post.id}" style="position: absolute; top: 20px; right: 20px; color: white; background: rgba(0,0,0,0.5); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; text-shadow: 0 1px 4px rgba(0,0,0,0.8); cursor: pointer; z-index: 20;">
                           <i class="ph ph-trash" style="font-size: 20px; color: var(--color-accent);"></i>
                       </div>`
                    : '';

                const reelHTML = `
                    <div class="reel-container" data-id="${post.id}" style="height: calc(100vh - 40px); width: 100%; scroll-snap-align: start; background: #000; border-radius: 8px; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; margin-bottom: 0;">
                        ${deletePostHtml}
                        <video src="${post.image_url}" controls style="width: 100%; height: 100%; object-fit: contain; background: black;" loop playsinline></video>
                        <div style="position: absolute; bottom: 20px; left: 20px; right: 80px; color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.8); z-index: 10;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <img src="${post.avatar_url || 'https://i.pravatar.cc/150'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid white;">
                                <div style="font-weight: 600;">${post.username}</div>
                            </div>
                            <div style="font-size: 14px; margin-bottom: 12px;">${post.caption || ''}</div>
                        </div>

                        <!-- Hidden Comment Side Panel -->
                        <div class="reel-comment-section" style="display: none; position: absolute; right: 80px; bottom: 40px; width: 320px; height: 60vh; background: #262626; border-radius: 12px; flex-direction: column; padding: 16px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: auto;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #363636; padding-bottom: 12px; margin-bottom: 12px;">
                                <span style="font-weight: 700; font-size: 16px; text-align: center; flex-grow: 1; color: white; text-shadow: none;">Comments</span>
                                <i class="ph ph-x close-reel-comment-btn" style="cursor: pointer; font-size: 20px; color: white; text-shadow: none;"></i>
                            </div>
                            <div class="reel-comments-list" style="flex-grow: 1; overflow-y: auto; font-size: 13px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 16px; color: white; text-shadow: none;"></div>
                            <div style="display: flex; gap: 8px; border-top: 1px solid #363636; padding-top: 12px; align-items: center;">
                                <img src="${userAvatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid #444;">
                                <input type="text" class="reel-comment-input" placeholder="Add a comment..." style="flex-grow: 1; background: transparent; border: none; color: white; outline: none; font-size: 14px; text-shadow: none;">
                                <button class="reel-post-comment-btn" style="background: transparent; color: var(--color-accent); border: none; font-weight: 600; cursor: pointer; text-shadow: none;">Post</button>
                            </div>
                        </div>
                        <div style="position: absolute; bottom: 40px; right: 20px; display: flex; flex-direction: column; gap: 24px; color: white; z-index: 10;">
                            <div class="reel-like-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.8); cursor: pointer;">
                                <i class="${heartClass} ph-heart" style="font-size: 28px;"></i>
                                <span class="reel-likes-count" style="font-size: 12px; font-weight: 600;">${likeCount}</span>
                            </div>
                            <div class="reel-comment-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.8); cursor: pointer;">
                                <i class="ph-fill ph-chat-circle" style="font-size: 28px;"></i>
                                <span class="reel-comments-count" style="font-size: 12px; font-weight: 600;">0</span>
                            </div>
                            <div class="reel-share-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.8); cursor: pointer;">
                                <i class="ph-fill ph-paper-plane-tilt" style="font-size: 28px;"></i>
                            </div>
                            <div class="reel-save-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.8); cursor: pointer;">
                                <i class="${savedSet.has(post.id) ? 'ph-fill ph-bookmark-simple' : 'ph ph-bookmark-simple'}" style="font-size: 28px;"></i>
                            </div>
                        </div>
                    </div>
                `;
                reelsView.insertAdjacentHTML('beforeend', reelHTML);
            });
            
            attachReelInteractions();
            
            // Set up Auto-play Intersection Observer
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const video = entry.target.querySelector('video');
                    if (!video) return;
                    
                    if (entry.isIntersecting) {
                        video.play().catch(e => console.log("Auto-play prevented by browser policy", e));
                    } else {
                        video.pause();
                        // Optional: Reset to beginning when out of view
                        // video.currentTime = 0; 
                    }
                });
            }, {
                root: reelsView,
                threshold: 0.6 // Video needs to be 60% visible to trigger
            });

            // Start observing all newly created reel containers
            reelsView.querySelectorAll('.reel-container').forEach(reel => {
                observer.observe(reel);
            });
            
        } catch (e) {
            console.error("Error loading reels", e);
            reelsView.innerHTML = '<div style="text-align: center; color: var(--danger); padding: 20px;">Could not load reels.</div>';
        }
    }

    // --- REEL INTERACTIONS LOGIC ---
    function attachReelInteractions() {
        // Post Deletion
        document.querySelectorAll('.reel-delete-post-btn').forEach(btn => {
            if(btn.dataset.bound === "true") return;
            btn.dataset.bound = "true";
            
            btn.addEventListener('click', async function() {
                if(!confirm("Are you sure you want to delete this reel?")) return;
                const postId = this.dataset.id;
                const reelEl = this.closest('.reel-container');
                if(reelEl) reelEl.remove();
                
                try {
                    await supabase.from('posts').delete().eq('id', postId);
                } catch(e) {
                    console.error("Error deleting reel", e);
                }
            });
        });

        // Liking
        document.querySelectorAll('.reel-like-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const reelEl = this.closest('.reel-container');
                const postId = reelEl.dataset.id;
                const icon = this.querySelector('i');
                const countSpan = this.querySelector('.reel-likes-count');
                const isCurrentlyLiked = icon.classList.contains('ph-fill');
                
                if (isCurrentlyLiked) {
                    icon.classList.remove('ph-fill', 'liked');
                    icon.classList.add('ph');
                    countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
                } else {
                    icon.classList.remove('ph');
                    icon.classList.add('ph-fill', 'liked');
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }

                try {
                    const { data: currentPost, error: fetchErr } = await supabase
                        .from('posts').select('likes').eq('id', postId).single();
                        
                    if(fetchErr) throw fetchErr;
                    
                    let newLikes = currentPost.likes || [];
                    if (isCurrentlyLiked) {
                        newLikes = newLikes.filter(id => id !== currentUser.id);
                    } else {
                        if(!newLikes.includes(currentUser.id)) newLikes.push(currentUser.id);
                    }
                    
                    await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
                } catch(e) {
                    console.error("Reel Like error:", e);
                }
            });
        });

        // Commenting (toggle visibility)
        document.querySelectorAll('.reel-comment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const reelEl = this.closest('.reel-container');
                const commentSection = reelEl.querySelector('.reel-comment-section');
                if (commentSection.style.display === 'none') {
                    commentSection.style.display = 'flex';
                    commentSection.querySelector('input').focus();
                } else {
                    commentSection.style.display = 'none';
                }
            });
        });
        
        document.querySelectorAll('.close-reel-comment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const reelEl = this.closest('.reel-container');
                const commentSection = reelEl.querySelector('.reel-comment-section');
                commentSection.style.display = 'none';
            });
        });

        // Post Comment
        document.querySelectorAll('.reel-post-comment-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const reelEl = this.closest('.reel-container');
                const postId = reelEl.dataset.id;
                const input = reelEl.querySelector('.reel-comment-input');
                const text = input.value.trim();
                
                if(!text) return;
                
                input.value = ''; // clear
                const originalText = this.textContent;
                this.textContent = '...';
                this.disabled = true;
                
                const username = currentUser.user_metadata.username || currentUser.email.split('@')[0];
                
                try {
                    const { data: newComment, error } = await supabase.from('comments').insert([{
                        post_id: postId,
                        username: username,
                        text: text
                    }]).select().single();
                    
                    if(error) throw error;
                    
                    const commentsList = reelEl.querySelector('.reel-comments-list');
                    const countSpan = reelEl.querySelector('.reel-comments-count');
                    
                    const deleteBtnHtml = `<i class="ph ph-trash reel-delete-comment" data-id="${newComment.id}" style="cursor: pointer; color: var(--text-inactive); font-size: 14px; margin-left: auto;"></i>`;
                        
                    const newCommentHtml = `
                        <div class="reel-comment-item" style="display: flex; align-items: flex-start; margin-bottom: 8px;" data-id="${newComment.id}">
                            <div style="flex-grow: 1;">
                                <span style="font-weight:600; margin-right:4px;">${newComment.username}</span>${newComment.text}
                                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                                    <span class="reel-reply-btn" data-username="${newComment.username}" style="cursor: pointer; font-weight: 600;">Reply</span>
                                </div>
                            </div>
                            ${deleteBtnHtml}
                        </div>`;
                    commentsList.insertAdjacentHTML('beforeend', newCommentHtml);
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                    
                    if(typeof attachDynamicCommentInteractions === 'function') attachDynamicCommentInteractions();
                    
                } catch(e) {
                    console.error("Reel Comment error", e);
                } finally {
                    this.textContent = originalText;
                    this.disabled = false;
                }
            });
        });

        // Share Modal Hook
        document.querySelectorAll('.reel-share-btn').forEach(btn => {
            if(btn.dataset.shareBound === "true") return;
            btn.dataset.shareBound = "true";
            btn.addEventListener('click', function() {
                const reelEl = this.closest('.reel-container');
                const videoEl = reelEl.querySelector('video');
                if(videoEl && typeof window.openShareModal === 'function') {
                    window.openShareModal(videoEl.src);
                }
            });
        });

        // Save Reel Logic
        document.querySelectorAll('.reel-save-btn').forEach(btn => {
            if(btn.dataset.bound === "true") return;
            btn.dataset.bound = "true";
            
            btn.addEventListener('click', async function() {
                const reelEl = this.closest('.reel-container');
                const postId = reelEl.dataset.id;
                const icon = this.querySelector('i');
                const isCurrentlySaved = icon.classList.contains('ph-fill');
                
                if (isCurrentlySaved) {
                    icon.classList.remove('ph-fill');
                    icon.classList.add('ph');
                } else {
                    icon.classList.remove('ph');
                    icon.classList.add('ph-fill');
                }

                try {
                    if (isCurrentlySaved) {
                        await supabase.from('saved_posts').delete().eq('user_id', currentUser.id).eq('post_id', postId);
                    } else {
                        await supabase.from('saved_posts').insert([{ user_id: currentUser.id, post_id: postId }]);
                    }
                } catch(e) {
                    console.error("Reel Save error:", e);
                }
            });
        });

        // Load existing comments for reels
        loadReelComments();
    }
    
    async function loadReelComments() {
        const reelElements = document.querySelectorAll('.reel-container');
        if(reelElements.length === 0) return;
        const postIds = Array.from(reelElements).map(el => el.dataset.id);
        const currentUsername = currentUser.user_metadata.username || currentUser.email.split('@')[0];
        
        try {
            const { data: comments, error } = await supabase
                .from('comments')
                .select('*')
                .in('post_id', postIds)
                .order('created_at', { ascending: true });
                
            if(error) return; 
            
            if(comments && comments.length > 0) {
                const commentCounts = {};
                comments.forEach(c => {
                    commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
                    const reelEl = document.querySelector(`.reel-container[data-id="${c.post_id}"]`);
                    if(reelEl) {
                        const commentsList = reelEl.querySelector('.reel-comments-list');
                        
                        const isOwnComment = c.username === currentUsername;
                        const deleteBtnHtml = isOwnComment 
                            ? `<i class="ph ph-trash reel-delete-comment" data-id="${c.id}" style="cursor: pointer; color: var(--text-inactive); font-size: 14px; margin-left: auto;"></i>` 
                            : '';
                            
                        const commentHtml = `
                            <div class="reel-comment-item" style="display: flex; align-items: flex-start; margin-bottom: 8px;" data-id="${c.id}">
                                <div style="flex-grow: 1;">
                                    <span style="font-weight:600; margin-right:4px;">${c.username}</span>${c.text}
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                                        <span class="reel-reply-btn" data-username="${c.username}" style="cursor: pointer; font-weight: 600;">Reply</span>
                                    </div>
                                </div>
                                ${deleteBtnHtml}
                            </div>`;
                        commentsList.insertAdjacentHTML('beforeend', commentHtml);
                    }
                });
                
                // Update counts
                Object.keys(commentCounts).forEach(id => {
                    const reelEl = document.querySelector(`.reel-container[data-id="${id}"]`);
                    if(reelEl) {
                        const countSpan = reelEl.querySelector('.reel-comments-count');
                        if (countSpan) countSpan.textContent = commentCounts[id];
                    }
                });
            }
            if(typeof attachDynamicCommentInteractions === 'function') attachDynamicCommentInteractions();
            
        } catch(e) {}
    }
    
    function attachDynamicCommentInteractions() {
        // Delete Comment
        document.querySelectorAll('.reel-delete-comment').forEach(btn => {
            if(btn.dataset.bound === "true") return;
            btn.dataset.bound = "true";
            
            btn.addEventListener('click', async function() {
                if(!confirm("Are you sure you want to delete this comment?")) return;
                const commentId = this.dataset.id;
                const reelEl = this.closest('.reel-container');
                const commentItem = this.closest('.reel-comment-item');
                
                commentItem.remove();
                const countSpan = reelEl.querySelector('.reel-comments-count');
                countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
                
                try {
                    await supabase.from('comments').delete().eq('id', commentId);
                } catch(e) { console.error("Error deleting comment", e); }
            });
        });
        
        // Reply to Comment
        document.querySelectorAll('.reel-reply-btn').forEach(btn => {
            if(btn.dataset.bound === "true") return;
            btn.dataset.bound = "true";
            
            btn.addEventListener('click', function() {
                const targetUsername = this.dataset.username;
                const reelEl = this.closest('.reel-container');
                const input = reelEl.querySelector('.reel-comment-input');
                input.value = `@${targetUsername} `;
                input.focus();
            });
        });
    }

    // --- CREATE MODAL LOGIC (Multi-Mode) ---
    // Try to grab the trigger button by 'uploadBtn' (from HTML) or fallback
    const createBtn = document.getElementById('uploadBtn') || document.getElementById('createPostBtn');
    const modal = document.getElementById('createPostModal');
    const closeBtn = document.querySelector('.close-modal');
    
    // Tab Elements
    const tabPost = document.getElementById('createTabPost');
    const tabReel = document.getElementById('createTabReel');
    const tabStory = document.getElementById('createTabStory');
    const allTabs = [tabPost, tabReel, tabStory];
    
    // Form Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('postImageInput');
    const imagePreview = document.getElementById('imagePreview');
    const videoPreview = document.getElementById('videoPreview');
    const captionContainer = document.getElementById('captionContainer');
    const captionInput = document.getElementById('postCaptionInput');
    const submitPostBtn = document.getElementById('submitPostBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const createModalTitle = document.getElementById('createModalTitle');
    const uploadIcon = document.getElementById('uploadIcon');
    const uploadText = document.getElementById('uploadText');

    let selectedFile = null;
    let currentUploadMode = 'post';

    if (createBtn && modal) {
        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'flex';
            switchTabMode('post');
            resetModal();
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resetModal();
        });
        
        // Tab Listeners
        if(tabPost) tabPost.addEventListener('click', () => switchTabMode('post'));
        if(tabReel) tabReel.addEventListener('click', () => switchTabMode('reel'));
        if(tabStory) tabStory.addEventListener('click', () => switchTabMode('story'));

        function switchTabMode(mode) {
            currentUploadMode = mode;
            allTabs.forEach(t => {
                if(!t) return;
                t.style.borderBottom = '2px solid transparent';
                t.style.color = 'var(--text-secondary)';
                t.classList.remove('active');
            });

            if (mode === 'post') {
                if(tabPost) { tabPost.style.borderBottom = '2px solid white'; tabPost.style.color = 'white'; tabPost.classList.add('active'); }
                if(createModalTitle) createModalTitle.textContent = 'Create new post';
                fileInput.accept = 'image/*,video/*';
                captionContainer.style.display = 'block';
                if(uploadIcon) uploadIcon.className = 'ph ph-image';
                if(uploadText) uploadText.textContent = 'Drag photos and videos here or click to select';
                submitPostBtn.textContent = 'Share Post';
            } 
            else if (mode === 'reel') {
                if(tabReel) { tabReel.style.borderBottom = '2px solid white'; tabReel.style.color = 'white'; tabReel.classList.add('active'); }
                if(createModalTitle) createModalTitle.textContent = 'Create new reel';
                fileInput.accept = 'video/*';
                captionContainer.style.display = 'block';
                if(uploadIcon) uploadIcon.className = 'ph ph-video-camera';
                if(uploadText) uploadText.textContent = 'Drag videos here or click to select';
                submitPostBtn.textContent = 'Share Reel';
            } 
            else if (mode === 'story') {
                if(tabStory) { tabStory.style.borderBottom = '2px solid white'; tabStory.style.color = 'white'; tabStory.classList.add('active'); }
                if(createModalTitle) createModalTitle.textContent = 'Create new story';
                fileInput.accept = 'image/*,video/*';
                captionContainer.style.display = 'none';
                if(uploadIcon) uploadIcon.className = 'ph ph-camera';
                if(uploadText) uploadText.textContent = 'Drag ephemeral photos and videos here';
                submitPostBtn.textContent = 'Add to Story';
            }
            
            // If user already had a file selected and switched modes to Reel, validate it's a video
            if (selectedFile && currentUploadMode === 'reel') {
                if (!selectedFile.type.startsWith('video/')) {
                    alert("Reels must be video files. Please select a video.");
                    resetModal();
                }
            }
        }

        uploadArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                // Strict Reel validation
                if (currentUploadMode === 'reel' && !file.type.startsWith('video/')) {
                    alert("Reels must be video files. Please select a video.");
                    e.target.value = '';
                    return;
                }
                
                selectedFile = file;

                const isVideo = selectedFile.type.startsWith('video/');
                const objectUrl = URL.createObjectURL(selectedFile);
                
                if (isVideo) {
                    if(videoPreview) {
                        videoPreview.src = objectUrl;
                        videoPreview.style.display = 'block';
                    }
                    if(imagePreview) imagePreview.style.display = 'none';
                } else {
                    if(imagePreview) {
                        imagePreview.src = objectUrl;
                        imagePreview.style.display = 'block';
                    }
                    if(videoPreview) videoPreview.style.display = 'none';
                }
                
                uploadArea.style.display = 'none';
                submitPostBtn.disabled = false;
            }
        });

        // Submit Logic targeting designated databases
        submitPostBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            const originalBtnText = submitPostBtn.textContent;
            submitPostBtn.disabled = true;
            submitPostBtn.textContent = 'Uploading...';
            uploadStatus.textContent = '';
            uploadStatus.className = 'auth-message text-center';

            try {
                // 1. Upload Media
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${currentUser.id}_${Date.now()}_${Math.random()}.${fileExt}`;
                const filePath = `${currentUser.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(filePath, selectedFile);

                if (uploadError) throw uploadError;

                // 2. Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(filePath);

                // 3. Database Injection
                if (currentUploadMode === 'post' || currentUploadMode === 'reel') {
                    // Into POSTS table
                    const { error: dbError } = await supabase
                        .from('posts')
                        .insert([{
                            user_id: currentUser.id,
                            username: username,
                            avatar_url: userAvatar,
                            image_url: publicUrl,
                            caption: captionInput.value,
                            likes: []
                        }]);

                    if (dbError) throw dbError;
                } else if (currentUploadMode === 'story') {
                    // Into STORIES table
                    const { error: dbError } = await supabase
                        .from('stories')
                        .insert([{
                            user_id: currentUser.id,
                            media_url: publicUrl,
                            username: currentUser.user_metadata.username || currentUser.email.split('@')[0],
                            avatar_url: currentUser.user_metadata.avatar_url
                        }]);

                    if (dbError) throw dbError;
                }

                uploadStatus.textContent = 'Uploaded successfully!';
                uploadStatus.classList.add('success');
                
                setTimeout(() => {
                    modal.style.display = 'none';
                    resetModal();
                    if (currentUploadMode === 'story') {
                        if(typeof loadStories === 'function') loadStories();
                    } else {
                        fetchFeed(); 
                    }
                }, 1500);

            } catch (error) {
                console.error("Upload error:", error);
                uploadStatus.textContent = `Error: ${error.message}.`;
                uploadStatus.classList.add('error');
                submitPostBtn.disabled = false;
                submitPostBtn.textContent = originalBtnText;
            }
        });
    }

    function resetModal() {
        selectedFile = null;
        fileInput.value = '';
        if(imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.src = '';
        }
        if (videoPreview) {
            videoPreview.style.display = 'none';
            videoPreview.src = '';
        }
        uploadArea.style.display = 'block';
        captionInput.value = '';
        submitPostBtn.disabled = true;
        
        if (currentUploadMode === 'post') submitPostBtn.textContent = 'Share Post';
        else if (currentUploadMode === 'reel') submitPostBtn.textContent = 'Share Reel';
        else if (currentUploadMode === 'story') submitPostBtn.textContent = 'Add to Story';
        
        uploadStatus.textContent = '';
        uploadStatus.className = 'auth-message text-center';
    }

    // --- EDIT PROFILE LOGIC ---
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditModalBtn = document.querySelector('.close-edit-profile-modal');
    const editAvatarContainer = document.getElementById('editAvatarContainer');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const editAvatarInput = document.getElementById('editAvatarInput');
    const cropperContainer = document.getElementById('cropperContainer');
    const cropperImage = document.getElementById('cropperImage');
    const editAvatarPreview = document.getElementById('editAvatarPreview');
    const editUsernameInput = document.getElementById('editUsernameInput');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const editProfileStatus = document.getElementById('editProfileStatus');

    let cropper = null;
    let newAvatarBlob = null;

    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener('click', () => {
            editUsernameInput.value = currentUser.user_metadata.username || currentUser.email.split('@')[0];
            editAvatarPreview.src = currentUser.user_metadata.avatar_url || 'https://i.pravatar.cc/150';
            editProfileModal.style.display = 'flex';
        });

        const closeEditModal = () => {
            editProfileModal.style.display = 'none';
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            cropperContainer.style.display = 'none';
            editAvatarContainer.style.display = 'flex';
            newAvatarBlob = null;
            if(editProfileStatus) editProfileStatus.textContent = '';
            editAvatarInput.value = '';
        };

        if(closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);

        if(changePhotoBtn) changePhotoBtn.addEventListener('click', () => editAvatarInput.click());
        if(editAvatarContainer) editAvatarContainer.addEventListener('click', () => editAvatarInput.click());

        if(editAvatarInput) editAvatarInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    cropperImage.src = event.target.result;
                    editAvatarContainer.style.display = 'none';
                    cropperContainer.style.display = 'block';

                    if (cropper) cropper.destroy();
                    
                    cropper = new Cropper(cropperImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 1,
                        restore: false,
                        guides: false,
                        center: false,
                        highlight: false,
                        cropBoxMovable: false,
                        cropBoxResizable: false,
                        toggleDragModeOnDblclick: false,
                    });
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        if(saveProfileBtn) saveProfileBtn.addEventListener('click', async () => {
            saveProfileBtn.disabled = true;
            saveProfileBtn.textContent = 'Saving...';
            editProfileStatus.textContent = '';
            editProfileStatus.className = 'auth-message text-center';

            try {
                let finalAvatarUrl = currentUser.user_metadata.avatar_url;

                // Upload cropped photo if it exists
                if (cropper) {
                    const canvas = cropper.getCroppedCanvas({
                        width: 400,
                        height: 400
                    });

                    newAvatarBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

                    const fileName = `${currentUser.id}_avatar_${Date.now()}.jpg`;
                    const filePath = `${currentUser.id}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('post-images')
                        .upload(filePath, newAvatarBlob);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('post-images')
                        .getPublicUrl(filePath);

                    finalAvatarUrl = publicUrl;
                }

                const newUsername = editUsernameInput.value.trim();
                
                // Update Supabase Auth MetaData
                const { data, error: updateError } = await supabase.auth.updateUser({
                    data: {
                        username: newUsername,
                        avatar_url: finalAvatarUrl
                    }
                });

                if (updateError) throw updateError;

                // Sync with existing posts
                await supabase.from('posts').update({ 
                    username: newUsername,
                    avatar_url: finalAvatarUrl 
                }).eq('user_id', currentUser.id);

                // Update Local UI instantly
                const profileViewAvatar = document.getElementById('profileViewAvatar');
                const profileViewUsername = document.getElementById('profileViewUsername');
                if(profileViewAvatar) profileViewAvatar.src = finalAvatarUrl;
                if(profileViewUsername) profileViewUsername.textContent = newUsername;
                
                const leftSidebarAvatar = document.getElementById('currentUserAvatar');
                if(leftSidebarAvatar) leftSidebarAvatar.src = finalAvatarUrl;

                const userAvatarGlobal = document.querySelector('.current-user img');
                const usernameGlobal = document.querySelector('.current-user .username');
                if (userAvatarGlobal) userAvatarGlobal.src = finalAvatarUrl;
                if (usernameGlobal) usernameGlobal.textContent = newUsername;

                // Update currentUser locally so immediate re-edits show current status
                currentUser.user_metadata.username = newUsername;
                currentUser.user_metadata.avatar_url = finalAvatarUrl;

                editProfileStatus.textContent = 'Profile updated successfully!';
                editProfileStatus.classList.add('success');

                setTimeout(() => {
                    closeEditModal();
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = 'Save Profile';
                    // Re-render feed to show new avatar/username on historical posts visually
                    fetchFeed();
                }, 1500);

            } catch (error) {
                console.error("Profile Edit Error:", error);
                editProfileStatus.textContent = `Error: ${error.message}`;
                editProfileStatus.classList.add('error');
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Save Profile';
            }
        });
    }

    // --- FEED LOGIC ---
    const postsContainer = document.querySelector('.posts');

    async function fetchFeed() {
        if (!postsContainer || !supabase) return;
        
        postsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading feed...</div>';

        try {
            const { data: posts, error } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!posts || posts.length === 0) {
                postsContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-color); border-radius: 8px;">
                        <i class="ph ph-camera" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;"></i>
                        <h3 style="margin-bottom: 8px;">No posts yet</h3>
                        <p style="color: var(--text-secondary);">Be the first one to share a post!</p>
                    </div>
                `;
                return;
            }

            postsContainer.innerHTML = ''; // Clear loading
            
            posts.forEach(post => {
                const isLiked = post.likes && post.likes.includes(currentUser.id);
                const likeCount = post.likes ? post.likes.length : 0;
                
                const heartClass = isLiked ? 'ph-fill liked' : 'ph';
                
                const postHTML = `
                    <article class="post" data-id="${post.id}">
                        <header class="post-header">
                            <div class="post-user-info">
                                <div class="story-ring small">
                                    <img src="${post.avatar_url || 'https://i.pravatar.cc/150'}" alt="User">
                                </div>
                                <div class="post-meta">
                                    <a href="#" class="username">${post.username}</a>
                                    <span class="time">• ${new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div style="position: relative;">
                                ${post.user_id === currentUser.id 
                                    ? `<button class="icon-btn feed-delete-post" data-id="${post.id}"><i class="ph ph-trash" style="color: var(--color-accent);"></i></button>`
                                    : `<button class="icon-btn toggle-post-menu"><i class="ph ph-dots-three"></i></button>
                                       <div class="post-menu-dropdown" style="display: none; position: absolute; right: 0; top: 100%; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 8px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                                            <button class="report-post-btn" data-id="${post.id}" style="background:transparent; border:none; color:var(--danger); padding:10px 16px; min-width:120px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px;"><i class="ph ph-warning-circle"></i> Report</button>
                                       </div>`
                                }
                            </div>
                        </header>
                        
                        <div class="post-image">
                            ${post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) 
                                ? `<video src="${post.image_url}" controls style="width: 100%; max-height: 600px; background: black; object-fit: contain;"></video>` 
                                : `<img src="${post.image_url}" alt="Post Image">`
                            }
                        </div>

                        <div class="post-actions">
                            <div class="action-left">
                                <button class="icon-btn action-icon heart-btn"><i class="${heartClass} ph-heart"></i></button>
                                <button class="icon-btn action-icon comment-btn"><i class="ph ph-chat-circle"></i></button>
                                <button class="icon-btn action-icon share-post-btn" data-url="${post.image_url}"><i class="ph ph-paper-plane-tilt"></i></button>
                            </div>
                        </div>

                        <div class="post-likes">
                            <span><strong><span class="likes-count">${likeCount}</span> likes</strong></span>
                        </div>

                        <div class="post-caption">
                            <a href="#" class="username">${post.username}</a> ${post.caption}
                        </div>

                        <div class="post-comments">
                            <div class="view-all-comments-btn" style="color: var(--text-secondary); cursor: pointer; margin-bottom: 8px; font-weight: 500;">View all comments</div>
                            <div class="comments-list" style="margin-bottom: 8px;">
                                <!-- Comments will load here -->
                            </div>
                            <div class="add-comment">
                                <input type="text" placeholder="Add a comment..." class="comment-input" style="background: transparent; border: none; outline: none; flex-grow: 1; color: white;">
                                <button class="post-comment-btn inline-post-comment-btn" style="background: transparent; border: none; color: var(--color-accent); font-weight: 600; cursor: pointer;">Post</button>
                            </div>
                        </div>
                    </article>
                `;
                postsContainer.insertAdjacentHTML('beforeend', postHTML);
            });

            attachPostInteractions();

        } catch (error) {
            console.error("Error fetching feed:", error);
            postsContainer.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 20px;">Could not load feed. Make sure your Supabase tables are set up correctly.</div>`;
        }
    }

    async function handleReportAction(postId, btnEl) {
        if(!confirm("Are you sure you want to report this content for moderation?")) return;
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Reporting...';
        
        try {
            // First read what the current count is
            const { data: post, error: fetchErr } = await supabase.from('posts').select('reports_count, user_id').eq('id', postId).single();
            // If column doesn't exist, this might throw, we catch and ignore or try pure update
            
            let currentReports = 0;
            if (post && post.reports_count !== undefined) currentReports = post.reports_count;
            currentReports += 1;
            
            // Insert granular report log
            await supabase.from('reports').insert([{
                post_id: postId,
                reporter_id: currentUser.id
            }]);
            
            // Update counts and flag if threshold breached (> 4 reports flag immediately)
            await supabase.from('posts').update({ 
                reports_count: currentReports, 
                is_flagged: currentReports > 4 
            }).eq('id', postId);
            
            alert("Content reported. Our admins will review this shortly.");
            btnEl.innerHTML = '<i class="ph-fill ph-check-circle"></i> Reported';
            btnEl.style.color = 'var(--success)';
        } catch(e) {
            console.error("Reporting failed", e);
            // Fallback optimistic UI
            alert("Report logged. Thank you for keeping the community safe.");
            btnEl.innerHTML = '<i class="ph-fill ph-check-circle"></i> Reported';
        }
    }

    function attachPostInteractions() {
        // Dropdown Toggles Custom
        document.querySelectorAll('.toggle-post-menu').forEach(btn => {
            if(btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Close others
                document.querySelectorAll('.post-menu-dropdown').forEach(d => { if(d !== this.nextElementSibling) d.style.display = 'none'; });
                const dropdown = this.nextElementSibling;
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        });
        
        // Hide globally
        document.addEventListener('click', () => {
             document.querySelectorAll('.post-menu-dropdown').forEach(d => d.style.display = 'none');
             document.querySelectorAll('.reel-menu-dropdown').forEach(d => d.style.display = 'none');
        });

        // Report Posts
        document.querySelectorAll('.report-post-btn').forEach(btn => {
            if(btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                handleReportAction(this.dataset.id, this);
            });
        });

        // Liking Logic
        document.querySelectorAll('.heart-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const postEl = this.closest('.post');
                const postId = postEl.dataset.id;
                const icon = this.querySelector('i');
                const isCurrentlyLiked = icon.classList.contains('ph-fill');
                const countSpan = postEl.querySelector('.likes-count');
                
                // Optimistic UI update
                if (isCurrentlyLiked) {
                    icon.classList.remove('ph-fill', 'liked');
                    icon.classList.add('ph');
                    countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
                } else {
                    icon.classList.remove('ph');
                    icon.classList.add('ph-fill', 'liked');
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                    
                    // Optional: Call Heart Burst animation
                    // createHeartBurst(event, postEl.querySelector('.post-image'));
                }

                // Update backend
                try {
                    // Fetch current likes
                    const { data: currentPost, error: fetchErr } = await supabase
                        .from('posts').select('likes').eq('id', postId).single();
                        
                    if(fetchErr) throw fetchErr;
                    
                    let newLikes = currentPost.likes || [];
                    if (isCurrentlyLiked) {
                        newLikes = newLikes.filter(id => id !== currentUser.id);
                    } else {
                        if(!newLikes.includes(currentUser.id)) newLikes.push(currentUser.id);
                    }
                    
                    await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
                } catch(e) {
                    console.error("Like error:", e);
                }
            });
        });

        // Double tap on image
        document.querySelectorAll('.post-image img').forEach(img => {
            let lastTap = 0;
            img.addEventListener('click', function(e) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    const post = this.closest('.post');
                    const heartBtn = post.querySelector('.heart-btn');
                    const icon = heartBtn.querySelector('i');
                    if (!icon.classList.contains('ph-fill')) {
                        heartBtn.click();
                    }
                    e.preventDefault();
                }
                lastTap = currentTime;
            });
        });

        // Open Post Viewer Modal
        document.querySelectorAll('.comment-btn').forEach(btn => {
            if(btn.dataset.viewerBound === "true") return;
            btn.dataset.viewerBound = "true";
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Opening modal from comment-btn");
                if(window.openPostViewerModal) {
                    window.openPostViewerModal(this.closest('.post'));
                } else {
                    console.error('window.openPostViewerModal is missing!');
                }
            });
        });
        
        document.querySelectorAll('.view-all-comments-btn').forEach(btn => {
            if(btn.dataset.bound === "true") return;
            btn.dataset.bound = "true";
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Opening modal from view-all-comments-btn");
                if(window.openPostViewerModal) {
                    window.openPostViewerModal(this.closest('.post'));
                }
            });
        });

        // Inline Commenting Logic
        document.querySelectorAll('.inline-post-comment-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const post = this.closest('.post');
                const postId = post.dataset.id;
                const input = post.querySelector('.comment-input');
                const text = input.value.trim();
                
                if(!text) return;
                
                input.value = ''; // clear
                
                // Add optimistically to DOM
                const commentsList = post.querySelector('.comments-list');
                const currentUsername = currentUser.user_metadata.username || currentUser.email.split('@')[0];
                const newCommentHtml = `<div style="font-size: 14px; margin-bottom: 4px;"><span class="username" style="font-weight:600; font-size:14px; margin-right:4px;">${currentUsername}</span>${text}</div>`;
                commentsList.insertAdjacentHTML('beforeend', newCommentHtml);
                
                // Upload to Supabase
                try {
                    await supabase.from('comments').insert([{
                        post_id: postId,
                        username: currentUsername,
                        text: text
                    }]);
                } catch(e) {
                    console.error("Comment error", e);
                }
            });
        });

        // Feed Share Interface Bound
        document.querySelectorAll('.share-post-btn').forEach(btn => {
            if(btn.dataset.shareBound === "true") return;
            btn.dataset.shareBound = "true";
            btn.addEventListener('click', function() {
                const url = this.dataset.url;
                if(url && typeof window.openShareModal === 'function') {
                    window.openShareModal(url);
                }
            });
        });
        
        // Feed Post Deletion Logic
        document.querySelectorAll('.feed-delete-post').forEach(btn => {
            if(btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';
            
            btn.addEventListener('click', async function() {
                if(!confirm("Are you sure you want to delete this post?")) return;
                const postId = this.dataset.id;
                const postEl = this.closest('.post');
                if(postEl) postEl.remove();
                
                try {
                    await supabase.from('posts').delete().eq('id', postId);
                } catch(e) {
                    console.error("Error deleting post", e);
                }
            });
        });
        
        // Load initial comments for each post
        loadAllComments();
    }
    
    async function loadAllComments() {
        const postElements = document.querySelectorAll('.post');
        if(postElements.length === 0) return;
        
        const postIds = Array.from(postElements).map(el => el.dataset.id);
        
        try {
            const { data: comments, error } = await supabase
                .from('comments')
                .select('*')
                .in('post_id', postIds)
                .order('created_at', { ascending: true });
                
            if(error) return;
            
            if(comments && comments.length > 0) {
                const commentMap = {};
                comments.forEach(c => {
                    if(!commentMap[c.post_id]) commentMap[c.post_id] = [];
                    commentMap[c.post_id].push(c);
                });
                
                Object.keys(commentMap).forEach(postId => {
                    const postEl = document.querySelector(`.post[data-id="${postId}"]`);
                    if(postEl) {
                        const commentsList = postEl.querySelector('.comments-list');
                        const viewAllBtn = postEl.querySelector('.view-all-comments-btn');
                        const postComments = commentMap[postId];
                        
                        if (postComments.length > 0) {
                            if (viewAllBtn) viewAllBtn.textContent = `View all ${postComments.length} comments`;
                        } else {
                            if (viewAllBtn) viewAllBtn.style.display = 'none';
                        }
                        
                        // only show last 2 comments max in feed
                        const previewComments = postComments.slice(-2);
                        previewComments.forEach(c => {
                            const commentHtml = `<div style="font-size: 14px; margin-bottom: 4px;"><span class="username" style="font-weight:600; font-size:14px; margin-right:4px;">${c.username}</span>${c.text}</div>`;
                            commentsList.insertAdjacentHTML('beforeend', commentHtml);
                        });
                    }
                });
            }
        } catch(e) {}
    }

    // --- SUGGESTIONS LOGIC ---
    async function loadSuggestedUsers() {
        const suggestionsList = document.querySelector('.suggestions-list');
        if (!suggestionsList) return;

        try {
            // Infer users from recent posts since we don't have a public profiles table
            const { data: posts, error } = await supabase
                .from('posts')
                .select('user_id, username, avatar_url')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            if (!posts || posts.length === 0) {
                suggestionsList.innerHTML = '<div style="font-size:12px; color:var(--text-secondary);">No suggestions right now.</div>';
                return;
            }

            // Extract unique users, excluding the current user
            const uniqueUsers = [];
            const seenIds = new Set();
            seenIds.add(currentUser.id);

            for (const post of posts) {
                if (!seenIds.has(post.user_id)) {
                    seenIds.add(post.user_id);
                    uniqueUsers.push({
                        id: post.user_id,
                        username: post.username,
                        avatar_url: post.avatar_url
                    });
                }
                if (uniqueUsers.length >= 5) break; 
            }

            if (uniqueUsers.length === 0) {
                suggestionsList.innerHTML = '<div style="font-size:12px; color:var(--text-secondary);">No suggestions right now.</div>';
                return;
            }

            // Sync current following data
            let followingSet = new Set();
            try {
                const { data: followingData } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', currentUser.id);
                if (followingData) {
                    followingData.forEach(f => followingSet.add(f.following_id));
                }
            } catch(e) {}

            suggestionsList.innerHTML = ''; 

            uniqueUsers.forEach(user => {
                const isFollowing = followingSet.has(user.id);
                const btnText = isFollowing ? 'Following' : 'Follow';
                const btnStyle = isFollowing 
                    ? 'color: var(--text-primary); background: none; -webkit-text-fill-color: var(--text-primary);'
                    : 'color: var(--color-accent); background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;';
                
                const itemHTML = `
                    <div class="suggestion-item">
                        <div class="story-ring small" style="width: 38px; height: 38px; padding: 1px;">
                            <img src="${user.avatar_url || 'https://i.pravatar.cc/150'}" alt="User">
                        </div>
                        <div class="user-details">
                            <span class="username" style="font-size: 14px; color: var(--text-primary); font-weight: 600;">${user.username}</span>
                            <span class="subtext">Suggested for you</span>
                        </div>
                        <button class="action-link follow-btn" data-id="${user.id}" style="${btnStyle}">${btnText}</button>
                    </div>
                `;
                suggestionsList.insertAdjacentHTML('beforeend', itemHTML);
            });

            // Make follow buttons interactive securely
            document.querySelectorAll('.follow-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const targetId = this.dataset.id;
                    const isFollowing = this.textContent === 'Following';
                    
                    if (isFollowing) {
                        this.textContent = 'Follow';
                        this.style.color = 'var(--color-accent)';
                        this.style.background = 'var(--gradient-primary)';
                        this.style.webkitBackgroundClip = 'text';
                        this.style.webkitTextFillColor = 'transparent';
                    } else {
                        this.textContent = 'Following';
                        this.style.color = 'var(--text-primary)';
                        this.style.background = 'none';
                        this.style.webkitTextFillColor = 'var(--text-primary)';
                    }
                    
                    try {
                        if (isFollowing) {
                            await supabase.from('follows')
                                .delete()
                                .eq('follower_id', currentUser.id)
                                .eq('following_id', targetId);
                        } else {
                            await supabase.from('follows')
                                .insert([{
                                    follower_id: currentUser.id,
                                    following_id: targetId
                                }]);
                                
                            // Add a notification!
                            await supabase.from('notifications')
                                .insert([{
                                    user_id: targetId,
                                    actor_id: currentUser.id,
                                    type: 'follow'
                                }]);
                        }
                    } catch(e) {
                        console.error("Follow error:", e);
                    }
                });
            });

        } catch (e) {
            console.error("Error loading suggestions:", e);
        }
    }

    // --- Logout ---
    const logoutBtn = document.querySelector('.more-options'); // Using "More" as logout for now
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'auth.html';
        });
        // Update label to Logout
        logoutBtn.querySelector('span').textContent = 'Logout';
        logoutBtn.querySelector('i').className = 'ph ph-sign-out';
    }

    // --- STORIES LOGIC ---
    async function loadStories() {
        const storiesScroll = document.getElementById('homeStoriesScroll');
        if (!storiesScroll) return;

        storiesScroll.innerHTML = '';
        
        let allStories = [];
        try {
            // Fetch stories from last 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .gte('created_at', yesterday)
                .order('created_at', { ascending: true }); // older stories first per user

            if(error) throw error;
            allStories = data || [];
        } catch(e) {
            console.log("Stories table might be missing", e);
        }

        // Group by user
        const activeUserStories = {};
        allStories.forEach(s => {
            if (!activeUserStories[s.user_id]) activeUserStories[s.user_id] = [];
            activeUserStories[s.user_id].push(s);
        });

        const myStories = activeUserStories[currentUser.id] || [];

        // 1. "Your Story" Bubble
        const myAvatar = currentUser.user_metadata?.avatar_url || 'https://i.pravatar.cc/150';
        if (myStories.length > 0) {
            storiesScroll.insertAdjacentHTML('beforeend', `
                <div class="story" data-user="${currentUser.id}">
                    <div class="story-ring active-gradient" style="cursor:pointer;" onclick="openStoryViewer('${currentUser.id}')">
                        <img src="${myAvatar}" alt="Your Story">
                    </div>
                    <span class="story-user">Your story</span>
                </div>
            `);
        } else {
            storiesScroll.insertAdjacentHTML('beforeend', `
                <div class="story" id="addStoryBtn">
                    <div class="story-ring" style="position:relative; cursor:pointer;">
                        <img src="${myAvatar}" alt="Your Story">
                        <div style="position:absolute; bottom:2px; right:2px; background:var(--color-accent); color:white; border-radius:50%; width:18px; height:18px; display:flex; justify-content:center; align-items:center; border:2px solid black; font-size:12px;">
                            <i class="ph ph-plus"></i>
                        </div>
                    </div>
                    <span class="story-user" style="color:var(--text-secondary);">Your story</span>
                </div>
            `);
        }

        // 2. Other Users' Bubbles
        Object.keys(activeUserStories).forEach(uid => {
            if (uid === currentUser.id) return;
            const userStories = activeUserStories[uid];
            const genericUsername = userStories[0].username || "User";
            const genericAvatar = userStories[0].avatar_url || 'https://i.pravatar.cc/150';
            
            storiesScroll.insertAdjacentHTML('beforeend', `
                <div class="story" data-user="${uid}">
                    <div class="story-ring active-gradient" style="cursor:pointer;" onclick="openStoryViewer('${uid}')">
                        <img src="${genericAvatar}" alt="Story">
                    </div>
                    <span class="story-user">${genericUsername}</span>
                </div>
            `);
        });

        // Store globally for the viewer
        window.currentActiveStories = activeUserStories;
        
        // Bind Add Story
        const addStoryBtn = document.getElementById('addStoryBtn');
        const uploadInput = document.getElementById('storyUploadInput');
        if (addStoryBtn && uploadInput) {
            addStoryBtn.addEventListener('click', () => uploadInput.click());
            
            // Only add event listener once
            if(!uploadInput.dataset.bound) {
                uploadInput.dataset.bound = "true";
                uploadInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if(!file) return;
                    
                    const fileName = `${currentUser.id}_story_${Date.now()}_${file.name}`;
                    try {
                        // Optimistic prompt
                        addStoryBtn.querySelector('i').className = 'ph ph-spinner ph-spin';
                        
                        const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
                        if (uploadError) throw uploadError;
                        
                        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
                        
                        // Insert into DB. We store username/avatar_url to avoid join issues
                        await supabase.from('stories').insert([{
                            user_id: currentUser.id,
                            media_url: publicUrl,
                            username: currentUser.user_metadata.username || currentUser.email.split('@')[0],
                            avatar_url: currentUser.user_metadata.avatar_url
                        }]);
                        
                        loadStories();
                    } catch(err) {
                        console.error("Story upload failed", err);
                        alert("Story upload failed. Did you create the table?");
                        loadStories();
                    }
                });
            }
        }
    }

    // --- STORY VIEWER LOGIC ---
    let storyTimer = null;
    let storyProgressInterval = null;
    let currentStoryUserIndex = 0;
    let currentStoryMediaIndex = 0;
    let viewerUserIds = [];

    window.openStoryViewer = function(startUserId) {
        if(!window.currentActiveStories) return;
        
        viewerUserIds = Object.keys(window.currentActiveStories);
        // Map current user to index
        currentStoryUserIndex = viewerUserIds.indexOf(startUserId);
        if(currentStoryUserIndex === -1) return;
        currentStoryMediaIndex = 0;
        
        document.getElementById('storyViewerModal').style.display = 'block';
        playCurrentStory();
    };

    function playCurrentStory() {
        clearTimeout(storyTimer);
        clearInterval(storyProgressInterval);
        
        if (currentStoryUserIndex >= viewerUserIds.length) {
            closeStoryViewer();
            return;
        }
        
        const uid = viewerUserIds[currentStoryUserIndex];
        const userStories = window.currentActiveStories[uid];
        
        if (currentStoryMediaIndex >= userStories.length) {
            // Next user
            currentStoryUserIndex++;
            currentStoryMediaIndex = 0;
            playCurrentStory();
            return;
        }

        const story = userStories[currentStoryMediaIndex];
        
        // Render UI
        document.getElementById('storyViewerAvatar').src = story.avatar_url || 'https://i.pravatar.cc/150';
        document.getElementById('storyViewerUsername').textContent = story.username || 'User';
        
        // Time ago
        const minsAgo = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 60000);
        document.getElementById('storyViewerTime').textContent = minsAgo > 60 ? Math.floor(minsAgo/60) + 'h' : minsAgo + 'm';

        // Render Bars
        const progressContainer = document.getElementById('storyViewerProgressContainer');
        progressContainer.innerHTML = '';
        userStories.forEach((s, idx) => {
            const bgStr = idx < currentStoryMediaIndex ? '100%' : '0%';
            progressContainer.insertAdjacentHTML('beforeend', `
                <div style="flex-grow: 1; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
                    <div id="storyBar-${idx}" style="height: 100%; width: ${bgStr}; background: white;"></div>
                </div>
            `);
        });

        // Media Play
        const imgEl = document.getElementById('storyViewerImage');
        const vidEl = document.getElementById('storyViewerVideo');
        if(imgEl) imgEl.style.display = 'none';
        if(vidEl) { vidEl.style.display = 'none'; vidEl.pause(); }

        const activeBar = document.getElementById(`storyBar-${currentStoryMediaIndex}`);
        let duration = 5000; // static 5 seconds for images

        const isVideo = story.media_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
        if (isVideo) {
            vidEl.src = story.media_url;
            vidEl.style.display = 'block';
            vidEl.play();
            duration = 15000; // default cap
            vidEl.onended = () => { advanceStory(); };
            
            // Re-sync duration to video actual time
            vidEl.onloadedmetadata = () => {
                duration = vidEl.duration * 1000;
            };
        } else {
            imgEl.src = story.media_url;
            imgEl.style.display = 'block';
        }

        // Progress Animation Engine
        let startTime = Date.now();
        storyProgressInterval = setInterval(() => {
            let elapsed = Date.now() - startTime;
            let percent = (elapsed / duration) * 100;
            if(percent > 100) percent = 100;
            if(activeBar) activeBar.style.width = `${percent}%`;
        }, 50);

        if(!isVideo) {
            storyTimer = setTimeout(() => { advanceStory(); }, duration);
        }
    }

    function advanceStory() {
        currentStoryMediaIndex++;
        playCurrentStory();
    }

    function regressStory() {
        if(currentStoryMediaIndex > 0) {
            currentStoryMediaIndex--;
        } else {
            if(currentStoryUserIndex > 0) {
                currentStoryUserIndex--;
                currentStoryMediaIndex = window.currentActiveStories[viewerUserIds[currentStoryUserIndex]].length - 1;
            }
        }
        playCurrentStory();
    }

    window.closeStoryViewer = function() {
        clearTimeout(storyTimer);
        clearInterval(storyProgressInterval);
        const vidEl = document.getElementById('storyViewerVideo');
        if(vidEl) vidEl.pause();
        const modal = document.getElementById('storyViewerModal');
        if(modal) modal.style.display = 'none';
        
        loadStories(); // Re-fetch to see if active gradient needs decay
    };

    // Story bindings
    const closeStoryBtn = document.querySelector('.close-story-modal');
    if(closeStoryBtn) closeStoryBtn.addEventListener('click', closeStoryViewer);
    
    const tapLeft = document.getElementById('storyTapLeft');
    const tapRight = document.getElementById('storyTapRight');
    if(tapLeft) tapLeft.addEventListener('click', (e) => { e.stopPropagation(); regressStory(); });
    if(tapRight) tapRight.addEventListener('click', (e) => { e.stopPropagation(); advanceStory(); });

    // --- MESSAGES LOGIC ---
    let chatPollInterval = null;
    let currentChatTargetId = null;

    async function loadMessagesView() {
        const sidebarList = document.getElementById('messagesSidebarList');
        const emptyState = document.getElementById('messagesEmptyState');
        const activeState = document.getElementById('messagesActiveState');
        
        if (!sidebarList) return;
        
        emptyState.style.display = 'flex';
        activeState.style.display = 'none';
        sidebarList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Loading followed accounts...</div>';
        
        try {
            // Find all people the current user FOLLOWS
            const { data: followsData, error: followsErr } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUser.id);

            if(followsErr) throw followsErr;

            if(!followsData || followsData.length === 0) {
                sidebarList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">You are not following anyone yet.</div>';
                return;
            }

            const followingIds = followsData.map(f => f.following_id);

            // Fetch basic cache from recent posts to associate usernames to IDs
            const { data: postsData } = await supabase
                .from('posts')
                .select('user_id, username, avatar_url');
                
            const userProfiles = {};
            if(postsData) {
                postsData.forEach(p => {
                    if (!userProfiles[p.user_id]) userProfiles[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
                });
            }

            sidebarList.innerHTML = '';
            followingIds.forEach(targetId => {
                const profile = userProfiles[targetId] || { username: 'User_' + targetId.substring(0,4), avatar_url: 'https://i.pravatar.cc/150' };
                
                const itemHtml = `
                    <div class="message-sidebar-item" data-id="${targetId}" data-username="${profile.username}" data-avatar="${profile.avatar_url}" style="padding: 16px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid var(--border-color);">
                        <img src="${profile.avatar_url}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <div style="font-weight: 600;">${profile.username}</div>
                            <div style="color: var(--text-secondary); font-size: 13px;">Tap to chat</div>
                        </div>
                    </div>
                `;
                sidebarList.insertAdjacentHTML('beforeend', itemHtml);
            });

            // Bind clicks
            document.querySelectorAll('.message-sidebar-item').forEach(item => {
                item.addEventListener('click', function() {
                    document.querySelectorAll('.message-sidebar-item').forEach(el => el.style.background = 'transparent');
                    this.style.background = 'var(--bg-hover)';
                    openChatRoom(this.dataset.id, this.dataset.username, this.dataset.avatar);
                });
            });

        } catch(e) {
            console.error("Messages load error:", e);
            sidebarList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Error loading inbox.</div>';
        }
    }

    function openChatRoom(targetId, username, avatar_url) {
        currentChatTargetId = targetId;
        
        document.getElementById('messagesEmptyState').style.display = 'none';
        document.getElementById('messagesActiveState').style.display = 'flex';
        
        document.getElementById('chatHeaderAvatar').src = avatar_url || 'https://i.pravatar.cc/150';
        document.getElementById('chatHeaderUsername').textContent = username;
        
        document.getElementById('chatHistory').innerHTML = ''; // Clear prior history
        
        fetchChatHistory();
        
        if(chatPollInterval) clearInterval(chatPollInterval);
        chatPollInterval = setInterval(fetchChatHistory, 3000); // 3 second sync pulse
    }
    
    // Stop polling if we navigate away
    function handleViewChangeForChat() {
        const msgView = document.getElementById('view-messages');
        if (msgView && !msgView.classList.contains('active')) {
            if(chatPollInterval) clearInterval(chatPollInterval);
            currentChatTargetId = null;
        } else if (msgView && msgView.classList.contains('active')) {
            loadMessagesView();
        }
    }
    
    // Tap into nav clicks to trigger teardowns mapped to views
    document.querySelectorAll('.nav-item a, .bottom-nav a').forEach(link => {
        link.addEventListener('click', () => { setTimeout(handleViewChangeForChat, 50); });
    });

    async function fetchChatHistory() {
        if(!currentChatTargetId) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatTargetId}),and(sender_id.eq.${currentChatTargetId},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true });
                
            if(error) throw error;
            
            // Mark any unread messages sent to the current user in this chat as read
            await supabase.from('messages')
                .update({ is_read: true })
                .eq('receiver_id', currentUser.id)
                .eq('sender_id', currentChatTargetId)
                .eq('is_read', false);
            
            
            const chatHistory = document.getElementById('chatHistory');
            
            // Diff injection guard to prevent scrolling stutter
            if(chatHistory.childElementCount !== (data ? data.length : 0)) {
                chatHistory.innerHTML = '';
                if(data) {
                    data.forEach(msg => {
                        const isMine = msg.sender_id === currentUser.id;
                        
                        const bubbleWrapper = document.createElement('div');
                        bubbleWrapper.style.display = 'flex';
                        bubbleWrapper.style.width = '100%';
                        bubbleWrapper.style.justifyContent = isMine ? 'flex-end' : 'flex-start';
                        
                        const bubble = document.createElement('div');
                        bubble.style.maxWidth = '70%';
                        bubble.style.padding = '10px 16px';
                        bubble.style.borderRadius = '20px';
                        bubble.style.fontSize = '14px';
                        bubble.style.wordBreak = 'break-word';
                        
                        if (isMine) {
                            bubble.style.background = 'var(--color-accent)';
                            bubble.style.color = 'white';
                        } else {
                            bubble.style.background = 'var(--bg-hover)';
                            bubble.style.color = 'var(--text-primary)';
                            bubble.style.border = '1px solid var(--border-color)';
                        }
                        
                        if (msg.content && msg.content.startsWith('[SHARED_POST]')) {
                            const url = msg.content.substring(13);
                            const isVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                            let mediaHtml = isVideo 
                                ? `<video src="${url}" style="width:140px; border-radius:8px; pointer-events:none;" muted loop autoplay playsinline></video>` 
                                : `<img src="${url}" style="width:140px; border-radius:8px; pointer-events:none;">`;
                            bubble.innerHTML = `<div style="font-weight:600; font-size:11px; margin-bottom:6px; opacity:0.8;">Shared a post</div>${mediaHtml}`;
                            
                            // Add click listener to redirect
                            bubble.style.cursor = 'pointer';
                            bubble.addEventListener('click', () => {
                                if(isVideo) {
                                    const navReels = document.getElementById('nav-reels');
                                    if(navReels) navReels.click();
                                } else {
                                    const navExplore = document.getElementById('nav-explore');
                                    if(navExplore) navExplore.click();
                                }
                            });
                        } else {
                            bubble.textContent = msg.content;
                        }

                        bubbleWrapper.appendChild(bubble);
                        chatHistory.appendChild(bubbleWrapper);
                    });
                }
                chatHistory.scrollTop = chatHistory.scrollHeight; // Force pin bottom
            }
        } catch(e) {
            console.error("Chat sync loop error:", e);
            if(chatPollInterval) clearInterval(chatPollInterval);
        }
    }

    // Chat Send Mechanism
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInputMessage = document.getElementById('chatInputMessage');
    if(chatSendBtn && chatInputMessage) {
        const sendMessage = async () => {
            if(!currentChatTargetId) return;
            const text = chatInputMessage.value.trim();
            if(!text) return;
            
            chatInputMessage.value = ''; 
            try {
                const { error } = await supabase.from('messages').insert([{
                    sender_id: currentUser.id,
                    receiver_id: currentChatTargetId,
                    content: text
                }]);
                if(error) throw error;
                fetchChatHistory(); // Force instant paint
            } catch(e) { console.error('DM Dispatch Failed', e); }
        };
        
        chatSendBtn.addEventListener('click', sendMessage);
        chatInputMessage.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') sendMessage();
        });
    }

    // --- GLOBAL BADGE & NOTIFICATIONS LOGIC ---
    async function checkUnreadBadges() {
        if (!currentUser) return;
        try {
            // Check unread Messages
            const { data: messagesData, error: msgErr } = await supabase
                .from('messages')
                .select('id')
                .eq('receiver_id', currentUser.id)
                .eq('is_read', false)
                .limit(1);
            
            const msgBadge = document.getElementById('messagesBadge');
            if(msgBadge && !msgErr) {
                msgBadge.style.display = (messagesData && messagesData.length > 0) ? 'block' : 'none';
            }

            // Check unread Notifications
            const { data: notifData, error: notifErr } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('is_read', false)
                .limit(1);
            
            const notifBadge = document.getElementById('notificationsBadge');
            if(notifBadge && !notifErr) {
                notifBadge.style.display = (notifData && notifData.length > 0) ? 'block' : 'none';
            }
        } catch(e) {
            console.log("Badge poll ignored", e);
        }
    }

    async function loadNotificationsView() {
        const notifList = document.getElementById('notificationsList');
        if(!notifList) return;
        
        notifList.innerHTML = '<div style="text-align:center; padding: 40px; color:var(--text-secondary);">Loading activity...</div>';
        
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
                
            if(error) throw error;
            
            notifList.innerHTML = '';
            
            if(!data || data.length === 0) {
                notifList.innerHTML = '<div style="text-align:center; padding: 40px; color:var(--text-secondary);">No new notifications.</div>';
                return;
            }
            
            data.forEach(n => {
                let text = "interacted with you.";
                if(n.type === 'follow') text = "started following you.";
                else if(n.type === 'like') text = "liked your post.";
                
                const minsAgo = Math.floor((Date.now() - new Date(n.created_at).getTime()) / 60000);
                const timeStr = minsAgo > 1440 ? Math.floor(minsAgo/1440) + 'd' : (minsAgo > 60 ? Math.floor(minsAgo/60) + 'h' : minsAgo + 'm');
                
                const isNew = n.is_read ? '' : '<div style="width:8px; height:8px; border-radius:50%; background:var(--color-accent);"></div>';

                notifList.insertAdjacentHTML('beforeend', `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom:1px solid var(--border-color); background: ${n.is_read ? 'transparent' : 'var(--bg-hover)'};">
                        <img src="https://i.pravatar.cc/150?u=${n.actor_id}" style="width:44px; height:44px; border-radius:50%; object-fit:cover;">
                        <div style="flex-grow:1;"><span style="font-weight:600;">User_${n.actor_id.substring(0,4)}</span> ${text} <span style="color:var(--text-secondary); margin-left:8px;">${timeStr}</span></div>
                        ${isNew}
                    </div>
                `);
            });
            
            // Mark all as read now that they've been loaded
            await supabase.from('notifications')
                .update({ is_read: true })
                .eq('user_id', currentUser.id)
                .eq('is_read', false);
                
            checkUnreadBadges(); // Clear badge immediately

        } catch(e) {
            console.error("Notif Error", e);
            notifList.innerHTML = '<div style="text-align:center; padding: 40px; color:var(--text-secondary);">Could not load notifications. Check your tables!</div>';
        }
    }

    // Attach load logic to clicks
    document.getElementById('nav-notifications').addEventListener('click', () => {
        loadNotificationsView();
    });

    // --- SEARCH LOGIC ---
    let searchDebounceTimer = null;
    const searchInput = document.getElementById('searchInputField');
    const searchGrid = document.getElementById('searchResultsGrid');

    if (searchInput && searchGrid) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            const keyword = e.target.value.trim();

            if (keyword.length === 0) {
                searchGrid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">Type a keyword to discover engaging posts and reels.</div>';
                return;
            }

            searchDebounceTimer = setTimeout(async () => {
                searchGrid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">Searching...</div>';
                
                try {
                    const kLower = keyword.toLowerCase();
                    let orQuery = `caption.ilike.%${keyword}%,username.ilike.%${keyword}%`;
                    
                    if (kLower.includes('video') || kLower.includes('reel')) {
                        orQuery += `,image_url.ilike.%.mp4%,image_url.ilike.%.mov%,image_url.ilike.%.webm%`;
                    } else if (kLower.includes('photo') || kLower.includes('pic') || kLower.includes('image')) {
                        orQuery += `,image_url.ilike.%.jpg%,image_url.ilike.%.png%,image_url.ilike.%.jpeg%,image_url.ilike.%.webp%`;
                    }

                    const { data, error } = await supabase
                        .from('posts')
                        .select('id, image_url, caption, username')
                        .or(orQuery)
                        .order('created_at', { ascending: false })
                        .limit(21);

                    if (error) throw error;

                    searchGrid.innerHTML = '';

                    if (!data || data.length === 0) {
                        searchGrid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">No matches found for "' + keyword + '".</div>';
                        return;
                    }

                    data.forEach(post => {
                        const isVideo = post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                        
                        let mediaHtml = isVideo 
                            ? `<video src="${post.image_url}" style="width:100%; height:100%; object-fit:cover;" muted autoplay loop playsinline></video>
                               <div style="position:absolute; top:8px; right:8px; color:white; background:rgba(0,0,0,0.5); padding:4px; border-radius:4px;"><i class="ph-fill ph-film-strip"></i></div>`
                            : `<img src="${post.image_url}" style="width:100%; height:100%; object-fit:cover;">`;

                        searchGrid.insertAdjacentHTML('beforeend', `
                            <div style="aspect-ratio: 1; background: var(--bg-hover); position:relative; overflow:hidden; cursor:pointer;" title="${post.username}: ${post.caption || ''}">
                                ${mediaHtml}
                            </div>
                        `);
                    });

                } catch (err) {
                    console.error("Search query failed:", err);
                    searchGrid.innerHTML = '<div style="grid-column: span 3; color: var(--danger); text-align: center; padding: 40px;">Error executing search.</div>';
                }
            }, 300); // 300ms debounce
        });
    }

    // --- EXPLORE LOGIC ---
    async function loadExploreGrid() {
        const exploreGrid = document.getElementById('exploreGrid');
        if (!exploreGrid) return;
        
        exploreGrid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">Loading global explore feed...</div>';
        
        try {
            // Fetch a larger batch of all media globally 
            const { data, error } = await supabase
                .from('posts')
                .select('id, image_url, caption, username')
                .order('created_at', { ascending: false })
                .limit(36);

            if (error) throw error;
            exploreGrid.innerHTML = '';

            if (!data || data.length === 0) {
                exploreGrid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">No global content found.</div>';
                return;
            }

            // Map results. Every 0, 9, 18.. element gets the large 2x2 block to naturally simulate the algorithmic masonry layout.
            data.forEach((post, index) => {
                const isVideo = post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                
                let mediaHtml = isVideo 
                    ? `<video src="${post.image_url}" style="width:100%; height:100%; object-fit:cover;" muted autoplay loop playsinline></video>
                       <div style="position:absolute; top:8px; right:8px; color:white; background:rgba(0,0,0,0.5); padding:4px; border-radius:4px;"><i class="ph-fill ph-film-strip"></i></div>`
                    : `<img src="${post.image_url}" style="width:100%; height:100%; object-fit:cover;">`;

                let gridSpan = '';
                // 0, 9, 18, 27
                if (index % 9 === 0) {
                    gridSpan = 'grid-column: span 2; grid-row: span 2;';
                }

                exploreGrid.insertAdjacentHTML('beforeend', `
                    <div style="aspect-ratio: 1; background: var(--bg-hover); position:relative; overflow:hidden; cursor:pointer; ${gridSpan}" title="${post.username}: ${post.caption || ''}">
                        ${mediaHtml}
                    </div>
                `);
            });
        } catch(e) {
            console.error("Explore Error:", e);
            exploreGrid.innerHTML = '<div style="grid-column: span 3; color: var(--danger); text-align: center; padding: 40px;">Error loading explore database.</div>';
        }
    }
    
    document.getElementById('nav-explore').addEventListener('click', loadExploreGrid);

    // --- SHARE MODAL LOGIC ---
    let currentShareMediaUrl = null;
    const shareModal = document.getElementById('shareMenuModal');
    const shareModalList = document.getElementById('shareModalList');
    
    // Attach listener to external objects to safely call modal
    window.openShareModal = async function(mediaUrl) {
        currentShareMediaUrl = mediaUrl;
        if(shareModal) shareModal.style.display = 'flex';
        
        if(shareModalList) shareModalList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Loading following...</div>';
        try {
            const { data: follows, error } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id);
            if(error) throw error;
            
            if(!follows || follows.length === 0) {
                if(shareModalList) shareModalList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Follow some users to share posts!</div>';
                return;
            }
            
            const followingIds = follows.map(f => f.following_id);
            // Re-use post caching trick for avatars
            const { data: postsData } = await supabase.from('posts').select('user_id, username, avatar_url').in('user_id', followingIds).order('created_at', { ascending: false });
            
            let userProfiles = {};
            if(postsData) {
                postsData.forEach(p => { if(!userProfiles[p.user_id]) userProfiles[p.user_id] = p; });
            }
            
            if(shareModalList) shareModalList.innerHTML = '';
            followingIds.forEach(targetId => {
                const profile = userProfiles[targetId] || { username: 'User_' + targetId.substring(0,6), avatar_url: 'https://i.pravatar.cc/150' };
                const rowBlock = document.createElement('div');
                rowBlock.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);';
                rowBlock.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <img src="${profile.avatar_url}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; margin-right:12px;">
                        <span style="font-weight:600; color:white;">${profile.username}</span>
                    </div>
                    <button class="modal-send-btn btn-primary" data-id="${targetId}" style="padding: 6px 16px; border-radius:20px; font-weight:600; font-size:12px; cursor:pointer; background: var(--color-accent); border:none; color:white;">Send</button>
                `;
                if(shareModalList) shareModalList.appendChild(rowBlock);
            });
            
            // Attach Send Logic
            document.querySelectorAll('.modal-send-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const targetId = this.dataset.id;
                    this.textContent = 'Sending...';
                    this.disabled = true;
                    this.style.background = 'transparent';
                    this.style.border = '1px solid var(--text-inactive)';
                    this.style.color = 'var(--text-inactive)';
                    
                    try {
                        const payload = `[SHARED_POST]${currentShareMediaUrl}`;
                        const { error } = await supabase.from('messages').insert([{
                            sender_id: currentUser.id,
                            receiver_id: targetId,
                            content: payload
                        }]);
                        if(error) throw error;
                        this.textContent = 'Sent';
                    } catch(e) {
                        console.error("Failed to share", e);
                        this.textContent = 'Failed';
                    }
                });
            });
        } catch(e) {
            if(shareModalList) shareModalList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--danger);">Error loading users.</div>';
        }
    };
    
    document.querySelector('.close-share-modal')?.addEventListener('click', () => {
        if(shareModal) shareModal.style.display = 'none';
        currentShareMediaUrl = null;
    });

    // Initialize Fetch Calls
    fetchFeed();
    loadSuggestedUsers();
    loadStories();
    setTimeout(handleViewChangeForChat, 100); 
    
    // Begin Global Polling
    checkUnreadBadges();
    setInterval(checkUnreadBadges, 5000); // 5 sec background heartbeat

    // --- SUPPORT CHAT SYSTEM ---
    const profileSettingsBtn = document.getElementById('profileSettingsBtn');
    const profileSettingsMenu = document.getElementById('profileSettingsMenu');
    const openSupportBtn = document.getElementById('openSupportBtn');
    const logoutBtnAlt = document.getElementById('logoutBtnAlt');
    const supportChatModal = document.getElementById('supportChatModal');
    const closeSupportModal = document.querySelector('.close-support-modal');
    const supportMessagesArea = document.getElementById('supportMessagesArea');
    const supportChatInput = document.getElementById('supportChatInput');
    const supportSendBtn = document.getElementById('supportSendBtn');

    if (profileSettingsBtn && profileSettingsMenu) {
        profileSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileSettingsMenu.style.display = profileSettingsMenu.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => {
             profileSettingsMenu.style.display = 'none';
        });
    }

    if (logoutBtnAlt && supabase) {
        logoutBtnAlt.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'auth.html';
        });
    }

    let supportSubscription = null;

    if (openSupportBtn && supportChatModal) {
        openSupportBtn.addEventListener('click', () => {
            supportChatModal.style.display = 'flex';
            loadUserSupportChat();
        });
        
        closeSupportModal.addEventListener('click', () => {
            supportChatModal.style.display = 'none';
            if(supportSubscription) {
                supabase.removeChannel(supportSubscription);
                supportSubscription = null;
            }
        });
    }

    async function loadUserSupportChat() {
        if (!supabase || !currentUser) return;
        
        try {
            const { data, error } = await supabase.from('support_messages')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: true });
                
            if (error) {
                if(error.code === '42P01') {
                    supportMessagesArea.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--danger); font-size: 13px;">System Error: Admins have not configured support database schema yet. Need support_messages table.</div>';
                }
                return;
            }
            
            supportMessagesArea.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary); font-size: 13px;">Welcome to Voxo Support.<br>An admin will be with you shortly.</div>';
            
            if (data) data.forEach(msg => appendSupportMessage(msg));
            supportMessagesArea.scrollTop = supportMessagesArea.scrollHeight;

            if (supportSubscription) supabase.removeChannel(supportSubscription);
            
            supportSubscription = supabase.channel('user_support_channel')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${currentUser.id}` }, payload => {
                    appendSupportMessage(payload.new);
                    supportMessagesArea.scrollTop = supportMessagesArea.scrollHeight;
                })
                .subscribe();
                
        } catch(err) { console.error(err); }
    }

    function appendSupportMessage(msg) {
        const isSelf = !msg.is_admin;
        const align = isSelf ? 'flex-end' : 'flex-start';
        const bg = isSelf ? 'linear-gradient(45deg, var(--color-accent), #ff1493)' : 'var(--bg-hover)';
        const color = 'white';
        const borderRadius = isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
        
        const html = `
            <div style="display:flex; justify-content: ${align}; width: 100%;">
                <div style="position:relative; max-width: 75%; padding: 10px 14px; border-radius: ${borderRadius}; background: ${bg}; color: ${color}; font-size: 14px; word-wrap: break-word;">
                    ${msg.message}
                    <div style="font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right;">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            </div>
        `;
        supportMessagesArea.insertAdjacentHTML('beforeend', html);
    }

    if (supportSendBtn && supportChatInput) {
        const sendMsg = async () => {
            const text = supportChatInput.value.trim();
            if(!text || !currentUser || !supabase) return;
            
            supportSendBtn.disabled = true;
            supportChatInput.disabled = true;
            try {
                const { error } = await supabase.from('support_messages').insert([{
                    user_id: currentUser.id,
                    message: text,
                    is_admin: false
                }]);
                if (error) throw error;
                supportChatInput.value = '';
            } catch(e) {
                alert("Could not send message. Support channel offline.");
            } finally {
                supportSendBtn.disabled = false;
                supportChatInput.disabled = false;
                supportChatInput.focus();
            }
        };
        supportSendBtn.addEventListener('click', sendMsg);
        supportChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMsg();
        });
    }

    // --- AI RECOMMENDATION ENGINE ---
    async function getRecommendedPosts(isReels = false) {
        if (!supabase || !currentUser) return [];

        try {
            // 1. Fetch user interactions to build Interest Vector
            let interestTags = [];
            const { data: savedData } = await supabase.from('saved_posts').select('post_id').eq('user_id', currentUser.id).limit(20);
            
            if (savedData && savedData.length > 0) {
                const postIds = savedData.map(s => s.post_id);
                const { data: interactionPosts } = await supabase.from('posts').select('caption').in('id', postIds);
                if (interactionPosts) {
                    interactionPosts.forEach(p => {
                        if (p.caption) {
                            const tags = p.caption.match(/#[\w]+/g);
                            if (tags) interestTags.push(...tags);
                        }
                    });
                }
            } else {
                const { data: myPosts } = await supabase.from('posts').select('caption').eq('user_id', currentUser.id).limit(10);
                if (myPosts) {
                    myPosts.forEach(p => {
                        if (p.caption) {
                            const tags = p.caption.match(/#[\w]+/g);
                            if (tags) interestTags.push(...tags);
                        }
                    });
                }
            }
            
            interestTags = [...new Set(interestTags.map(t => t.toLowerCase()))];

            // 2. Fetch Global Pool
            const { data: globalPosts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
            if (error) throw error;
            if (!globalPosts) return [];

            // 3. Fetch Follows Bias
            const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id);
            const followingIds = followsData ? followsData.map(f => f.following_id) : [];

            // 4. Scoring Logic
            const scoredPosts = globalPosts
                .filter(post => {
                    if (isReels) return post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                    return true;
                })
                .map(post => {
                    let score = 0;
                    if (post.likes && post.likes.length) score += post.likes.length;
                    
                    if (post.caption && interestTags.length > 0) {
                        const postTags = post.caption.match(/#[\w]+/g) || [];
                        postTags.forEach(t => {
                            if (interestTags.includes(t.toLowerCase())) score += 10;
                        });
                    }

                    if (followingIds.includes(post.user_id)) score += 50;
                    score += Math.random() * 5; // Jitter to keep feed fresh

                    return { ...post, recommendation_score: score };
                });

            // 5. Rank
            scoredPosts.sort((a, b) => b.recommendation_score - a.recommendation_score);
            return scoredPosts.slice(0, 15);
        } catch(e) {
            console.error("AI Recommendation Error:", e);
            return [];
        }
    }

    // --- EXPLORE VIEW LOGIC ---
    window.loadExploreView = async function() {
        const grid = document.getElementById('exploreGrid');
        if (!grid) return;
        
        grid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">Generating curated recommendations...</div>';
        
        const recommendedPosts = await getRecommendedPosts(false);
        
        if (recommendedPosts.length === 0) {
             grid.innerHTML = '<div style="grid-column: span 3; color: var(--text-secondary); text-align: center; padding: 40px;">No global content available to analyze.</div>';
             return;
        }

        grid.innerHTML = '';
        recommendedPosts.forEach(post => {
            const isVideo = post.image_url && post.image_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
            const item = `
                <div style="aspect-ratio: 1; overflow: hidden; position: relative; cursor: pointer;" class="profile-grid-item" data-id="${post.id}">
                    ${isVideo
                        ? `<video src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>
                           <i class="ph-fill ph-video-camera" style="position:absolute; top:8px; right:8px; color:white; font-size:20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);"></i>`
                        : `<img src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;">`
                    }
                    <div class="grid-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; gap:16px;">
                        <span style="color:white; font-weight:600; display:flex; align-items:center; gap:6px;"><i class="ph-fill ph-heart"></i> ${post.likes ? post.likes.length : 0}</span>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', item);
        });

        document.querySelectorAll('#exploreGrid .profile-grid-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.querySelector('.grid-overlay').style.opacity = '1');
            item.addEventListener('mouseleave', () => item.querySelector('.grid-overlay').style.opacity = '0');
        });
    };

    // --- REELS VIEW LOGIC (TikTok Style) ---
    window.loadReelsView = async function() {
        const container = document.querySelector('#view-reels .reels-container');
        if (!container) return;
        
        container.innerHTML = '<div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color: var(--text-secondary); width:100%;">Curating your FYP...</div>';
        
        const recommendedReels = await getRecommendedPosts(true);
        
        if (recommendedReels.length === 0) {
             container.innerHTML = '<div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color: var(--text-secondary); width: 100%;"><i class="ph ph-video-camera-slash" style="font-size:48px; margin-bottom:16px;"></i><span>No videos available right now.</span></div>';
             return;
        }

        container.innerHTML = '';
        recommendedReels.forEach(post => {
            const html = `
                <div class="reel-item" data-id="${post.id}">
                    <video src="${post.image_url}" class="reel-video" autoplay loop muted playsinline></video>
                    <div class="reel-overlay-gradient"></div>
                    
                    <div class="reel-actions-right">
                        <div class="reel-profile-btn" data-userid="${post.user_id}">
                            <img src="${post.avatar_url || 'https://i.pravatar.cc/150?u=' + post.user_id}" alt="User">
                            <div class="follow-badge"><i class="ph ph-plus"></i></div>
                        </div>
                        <button class="reel-action-btn heart-btn"><i class="ph-fill ph-heart"></i><span>${post.likes ? post.likes.length : 0}</span></button>
                        <button class="reel-action-btn"><i class="ph-fill ph-chat-circle-dots"></i><span>Chat</span></button>
                        <button class="reel-action-btn"><i class="ph-fill ph-share-fat"></i><span>Share</span></button>
                        
                        <div style="position:relative;">
                            <button class="reel-action-btn toggle-reel-menu"><i class="ph-fill ph-dots-three"></i><span>More</span></button>
                            <div class="reel-menu-dropdown" style="display:none; position:absolute; bottom:50px; right:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); border-radius:8px; z-index:100; border:1px solid rgba(255,255,255,0.1);">
                                <button class="report-reel-btn" data-id="${post.id}" style="background:transparent; border:none; color:var(--danger); padding:12px 20px; min-width:120px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px;"><i class="ph-fill ph-warning-circle"></i>Report</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="reel-info-bottom">
                        <a href="#" class="reel-username">@${post.username || 'Creator'}</a>
                        <p class="reel-caption">${post.caption || ''}</p>
                        <div class="reel-music">
                            <i class="ph ph-music-note"></i>
                            <marquee scrollamount="4" style="width: 150px;">Original Audio - @${post.username || 'Creator'}</marquee>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
        
        // Handle Video Intersection Observer (Play/Pause on scroll)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (entry.isIntersecting) {
                    if(video) video.play().catch(() => console.log("Autoplay blocked by browser policy"));
                } else {
                    if(video) video.pause();
                }
            });
        }, { threshold: 0.6 });

        container.querySelectorAll('.reel-item').forEach(item => {
            observer.observe(item);
            const vid = item.querySelector('video');
            if (vid) {
                vid.addEventListener('click', () => {
                    vid.muted = !vid.muted;
                });
            }
            
            // Bind Reel Menus
            const toggleBtn = item.querySelector('.toggle-reel-menu');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const dropdown = this.nextElementSibling;
                    document.querySelectorAll('.reel-menu-dropdown').forEach(d => { if(d !== dropdown) d.style.display = 'none'; });
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                });
            }
            
            // Bind Reel Report Action
            const reportBtn = item.querySelector('.report-reel-btn');
            if (reportBtn) {
                reportBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if(typeof handleReportAction === 'function') {
                        handleReportAction(this.dataset.id, this);
                    }
                });
            }
        });
    };

    // Modal logic for Post Viewer (Comments Only Panel)
    window.openPostViewerModal = function(postEl) {
        const modal = document.getElementById('postViewerModal');
        const postId = postEl.dataset.id;
        if(!modal || !postId) return;

        const avatarSrc = postEl.querySelector('.post-user-info img').src;
        const usernameStr = postEl.querySelector('.post-user-info .username').textContent;

        document.getElementById('postViewerAvatar').src = currentUser.user_metadata.avatar_url || 'https://i.pravatar.cc/150';
        document.getElementById('postViewerCaptionAvatar').src = avatarSrc;
        document.getElementById('postViewerCaptionUsername').textContent = usernameStr;
        
        let captionText = "";
        const captionNodes = postEl.querySelector('.post-caption').childNodes;
        captionNodes.forEach(n => {
            if (n.nodeType === 3) captionText += n.textContent; 
            if (n.nodeType === 1 && !n.classList.contains('username')) captionText += n.outerHTML; 
        });
        document.getElementById('postViewerCaptionText').innerHTML = captionText.trim();

        modal.dataset.activePostId = postId;
        
        const dynamicComments = document.getElementById('postViewerDynamicComments');
        dynamicComments.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Loading comments...</div>';
        
        supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
            .then(({data, error}) => {
                dynamicComments.innerHTML = '';
                if(error || !data || data.length === 0) {
                    dynamicComments.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No comments yet.</div>';
                    return;
                }
                const currentUsernameStr = currentUser.user_metadata.username || currentUser.email.split('@')[0];
                data.forEach(c => {
                    const isOwn = c.username === currentUsernameStr;
                    const deleteHtml = isOwn ? `<i class="ph ph-trash delete-viewer-comment" data-id="${c.id}" style="cursor: pointer; color: var(--text-inactive); margin-left: auto;"></i>` : '';
                    const cHtml = `
                        <div class="viewer-comment-item" style="display: flex; gap: 12px; margin-bottom: 8px;">
                            <img src="https://i.pravatar.cc/150?u=${c.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                            <div style="flex-grow: 1;">
                                <span style="font-weight:600; font-size:13px; margin-right:4px;">${c.username}</span>
                                <span style="font-size:13px;">${c.text}</span>
                                <div style="display: flex; gap: 12px; font-size:11px; color:var(--text-secondary); margin-top:4px; font-weight:600; cursor:pointer;">
                                    <span>Reply</span>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                <i class="ph ph-heart" style="font-size: 14px; color: var(--text-secondary);"></i>
                                ${deleteHtml}
                            </div>
                        </div>
                    `;
                    dynamicComments.insertAdjacentHTML('beforeend', cHtml);
                });
                
                dynamicComments.querySelectorAll('.delete-viewer-comment').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        if(!confirm("Delete comment?")) return;
                        const cId = this.dataset.id;
                        this.closest('.viewer-comment-item').remove();
                        try { await supabase.from('comments').delete().eq('id', cId); } catch(e){}
                    });
                });
            });

        modal.style.display = 'flex';
    };

    const postViewerModal = document.getElementById('postViewerModal');
    if (postViewerModal) {
        document.querySelector('.close-post-modal').addEventListener('click', () => {
            postViewerModal.style.display = 'none';
            const vid = document.getElementById('postViewerVideo');
            if(vid) vid.pause();
        });
        
        document.getElementById('postViewerPostCommentBtn').addEventListener('click', async () => {
            const input = document.getElementById('postViewerCommentInput');
            const postId = postViewerModal.dataset.activePostId;
            const text = input.value.trim();
            if(!text || !postId) return;
            
            input.value = '';
            const currentUsernameStr = currentUser.user_metadata.username || currentUser.email.split('@')[0];
            
            const dynamicComments = document.getElementById('postViewerDynamicComments');
            if(dynamicComments.innerHTML.includes('No comments yet')) dynamicComments.innerHTML = '';
            
            const cHtml = `
                <div class="viewer-comment-item" style="display: flex; gap: 12px; margin-bottom: 8px;">
                    <img src="https://i.pravatar.cc/150?u=${currentUsernameStr}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                    <div style="flex-grow: 1;">
                        <span style="font-weight:600; font-size:13px; margin-right:4px;">${currentUsernameStr}</span>
                        <span style="font-size:13px;">${text}</span>
                    </div>
                </div>
            `;
            dynamicComments.insertAdjacentHTML('beforeend', cHtml);
            
            try {
                await supabase.from('comments').insert([{
                    post_id: postId,
                    username: currentUsernameStr,
                    text: text
                }]);
                
                const postEl = document.querySelector(`.post[data-id="${postId}"]`);
                if(postEl) {
                    const commentsList = postEl.querySelector('.comments-list');
                    if(commentsList) {
                        commentsList.insertAdjacentHTML('beforeend', `<div style="font-size: 14px; margin-bottom: 4px;"><span class="username" style="font-weight:600; font-size:14px; margin-right:4px;">${currentUsernameStr}</span>${text}</div>`);
                    }
                }
            } catch(e) { console.error("Comment post error via viewer", e); }
        });
    }

});
