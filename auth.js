document.addEventListener('DOMContentLoaded', () => {
    // --- UI Tab Switching ---
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active-form'));
            
            // Add active class to clicked
            tab.classList.add('active');
            const formId = tab.dataset.tab + 'Form';
            document.getElementById(formId).classList.add('active-form');
            
            // Clear messages
            document.querySelectorAll('.auth-message').forEach(m => m.textContent = '');
        });
    });

    // --- Supabase Authentication ---
    
    // Check if Supabase client is available before trying to use it
    const supabase = window.supabaseClient;
    
    // Redirect if already logged in
    async function checkUser() {
        if (!supabase) return; // Wait for config
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            if (session.user.user_metadata?.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    }
    checkUser();

    // Handle Login
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = loginForm.querySelector('button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabase) return alert("Supabase config required.");
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        loginError.textContent = '';
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            
            // Success, redirect appropriately
            if (data.user && data.user.user_metadata?.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
            
        } catch (error) {
            loginError.textContent = error.message;
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Log In';
        }
    });

    // Handle Signup
    const signupForm = document.getElementById('signupForm');
    const signupError = document.getElementById('signupError');
    const signupSuccess = document.getElementById('signupSuccess');
    const signupBtn = signupForm.querySelector('button');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabase) return alert("Supabase config required.");

        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const username = document.getElementById('signupUsername').value;

        signupBtn.disabled = true;
        signupBtn.textContent = 'Signing up...';
        signupError.textContent = '';
        signupSuccess.textContent = '';

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,
                        avatar_url: `https://i.pravatar.cc/150?u=${username}`
                    }
                }
            });

            if (error) throw error;

            if (data.user && data.session === null) {
                 signupSuccess.textContent = 'Check your email for the confirmation link!';
            } else {
                 // Auto login
                 window.location.href = 'index.html';
            }

        } catch (error) {
            signupError.textContent = error.message;
        } finally {
            signupBtn.disabled = false;
            signupBtn.textContent = 'Sign Up';
        }
    });
});
