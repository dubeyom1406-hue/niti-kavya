// --- Dynamic User & Data Manager ---
function getOrCreateUser(email) {
    let users = JSON.parse(localStorage.getItem('nitikavya_users') || '{}');
    if (!users[email]) {
        const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        users[email] = {
            id: "usr_" + Math.random().toString(36).substr(2, 9),
            name: name, email: email,
            avatar: `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`,
            role: "Aspirant",
            stats: { attendance: 0, testsDone: 0, rank: "TBD", xp: 0, streak: 0 },
            verified: false, // Default unverified
            completedLectures: [],
            completedDPPs: [],
            lastActivityDate: null,
            enrolledBatches: [], testHistory: []
        };
        localStorage.setItem('nitikavya_users', JSON.stringify(users));
    }
    // Migration for old users
    if (!users[email].stats.xp) {
        users[email].stats.xp = 0;
        users[email].stats.streak = 0;
        users[email].completedLectures = users[email].completedLectures || [];
        users[email].completedDPPs = users[email].completedDPPs || [];
    }
    return users[email];
}

function saveUser() {
    let users = JSON.parse(localStorage.getItem('nitikavya_users') || '{}');
    users[currentUser.email] = currentUser;
    localStorage.setItem('nitikavya_users', JSON.stringify(users));
}

// --- Portal State Manager ---
let currentUser = null;
let quizState = { questions: [], currentIdx: 0, score: 0, isFinished: false, answers: [] };
const portalContent = document.getElementById('portal-content');
const sidebarItems = document.querySelectorAll('.sidebar-nav li');

document.addEventListener('DOMContentLoaded', () => {
    loadUserSession();
    setupNavigation();
    initCustomCursor();

    // Auto-refresh when admin updates content
    window.addEventListener('storage', (e) => {
        if (e.key === 'nitikavya_catalog') {
            console.log("Catalog updated by admin, refreshing view...");
            ALL_BATCH_CATALOG = JSON.parse(e.newValue) || DEFAULT_CATALOG;
            const currentSection = document.querySelector('.sidebar-nav li.active')?.dataset.section;
            if (currentSection) renderSection(currentSection);
        }
    });

    // Mobile Sidebar Toggle Logic
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.portal-sidebar');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
                sidebar.classList.remove('active');
            }
        });

        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => sidebar.classList.remove('active'));
        });
    }

    // Search Functionality
    const searchInput = document.getElementById('portal-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch(searchInput.value);
            }
        });
    }
});

function handleSearch(query) {
    if (!query) return;
    const term = query.toLowerCase();
    const results = ALL_BATCH_CATALOG.filter(b =>
        b.title.toLowerCase().includes(term) ||
        b.category.toLowerCase().includes(term) ||
        (b.description && b.description.toLowerCase().includes(term))
    );

    portalContent.innerHTML = `
        <h2 class="section-title">Search Results: "${query}"</h2>
        <div class="resource-grid" style="margin-top:20px;">
            ${results.map(b => `
                <div class="admin-card">
                    <div style="width:100%; height:180px; background:#000; border-radius:12px; margin-bottom:15px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <img src="${b.image}" style="width:100%; height:100%; object-fit:contain;">
                    </div>
                    <h3>${b.title}</h3>
                    <p style="font-size:12px; color:#888;">${b.category}</p>
                    ${currentUser.enrolledBatches.some(eb => eb.id === b.id) ?
            `<button class="btn btn-primary full-width" style="margin-top:20px;" onclick="window.portal.openBatch('${b.id}')">OPEN BATCH</button>` :
            `<button class="btn btn-outline full-width" style="margin-top:20px;" onclick="window.portal.enrollInBatch('${b.id}')">ENROLL NOW</button>`
        }
                </div>
            `).join('') || '<p>No matching batches found.</p>'}
        </div>
    `;
}

function loadUserSession() {
    const storedEmail = localStorage.getItem('loggedUser');
    if (!storedEmail) { window.location.href = 'index.html'; return; }
    currentUser = getOrCreateUser(storedEmail);
    updateUserUI();
    renderSection('dashboard');
}

function updateUserUI() {
    document.querySelector('.user-name').innerText = currentUser.name;
    document.querySelector('.user-role').innerText = currentUser.role;
    document.querySelector('.user-avatar img').src = currentUser.avatar;

    // Show Admin Link in Sidebar if the user is admin
    if (currentUser.email === 'admin@nitikavya.com') {
        const nav = document.querySelector('.sidebar-nav ul');
        if (!document.getElementById('admin-link-li')) {
            const li = document.createElement('li');
            li.id = 'admin-link-li';
            li.innerHTML = `<a href="admin.html" style="color: var(--primary); font-weight: 900; background: rgba(255,107,0,0.1);"><span class="icon">⚙️</span> Admin Panel</a>`;
            nav.appendChild(li);
        }
    }
}

function setupNavigation() {
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            if (!sectionId) return;
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderSection(sectionId);
        });
    });
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (confirm('Log out?')) { localStorage.removeItem('loggedUser'); window.location.href = 'index.html'; }
    });
}

const DEFAULT_CATALOG = [{ id: 'free-youtube-2026', title: "Mission Selection 2026", category: "YOUTUBE", target: "All Government Exams", icon: "▶️", price: "FREE", image: "assets/youtube-poster.jpg", classes: [] }];
let ALL_BATCH_CATALOG = JSON.parse(localStorage.getItem('nitikavya_catalog')) || DEFAULT_CATALOG;

function renderSection(sectionId) {
    ALL_BATCH_CATALOG = JSON.parse(localStorage.getItem('nitikavya_catalog')) || DEFAULT_CATALOG;
    portalContent.innerHTML = '';
    switch (sectionId) {
        case 'dashboard': renderDashboard(); break;
        case 'my-batches': renderBatches(); break;
        case 'browse-batches': renderCatalog(); break;
        case 'leaderboard': renderLeaderboard(); break;
        case 'resources': renderAdminManagedSection('PDF Resources', 'pdf_resources'); break;
        case 'test-series': renderAdminManagedSection('Test Series', 'test_series'); break;
        case 'announcements': renderAdminManagedSection('Announcements', 'announcements'); break;
        case 'profile': renderProfile(); break;
        default: portalContent.innerHTML = `<h2 class="section-title">Section: ${sectionId}</h2><p>Wait for next update...</p>`;
    }
}

const DASHBOARD_QUOTES = [
    "Vigyan Shastram, Vidya Prapti: Your only weapon is your knowledge.",
    "The secret of selection is discipline and consistency.",
    "Hard work beats talent when talent doesn't work hard.",
    "Dhairya and Sahas: The two pillars of a successful aspirant.",
    "Every lecture you finish is a step closer to your uniform.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts."
];

function getDailyQuote() {
    const day = new Date().getDate() % DASHBOARD_QUOTES.length;
    return DASHBOARD_QUOTES[day];
}

function getCourseCompletion() {
    let totalItems = 0;
    let completedItems = (currentUser.completedLectures?.length || 0) + (currentUser.completedDPPs?.length || 0);

    currentUser.enrolledBatches.forEach(b => {
        totalItems += (b.classes?.length || 0) * 2; // Lecture + DPP per class
    });

    if (totalItems === 0) return 0;
    return Math.round((completedItems / totalItems) * 100);
}

function renderDashboard() {
    const completion = getCourseCompletion();

    // Get fresh batch data
    const activeBatches = currentUser.enrolledBatches.map(ub => {
        const fresh = ALL_BATCH_CATALOG.find(b => b.id === ub.id);
        return fresh ? { ...ub, ...fresh } : ub;
    }).filter(b => b);

    // Verification Banner
    const verifyBanner = !currentUser.verified ? `
        <div style="background: rgba(255,0,0,0.15); border: 1px solid #ff4444; border-radius: 12px; padding: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display:flex; gap:15px; align-items:center;">
                <span style="font-size:20px;">⚠️</span>
                <div>
                    <h4 style="color: #ff8888; font-size: 14px; margin-bottom: 2px;">Email Not Verified</h4>
                    <p style="color: #ccc; font-size: 11px;">Please verify your email to unlock all features.</p>
                </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.portal.openVerifyModal()">VERIFY NOW</button>
        </div>
    ` : '';

    portalContent.innerHTML = `
        <div class="dashboard-container">
            ${verifyBanner}
            <!-- Welcome Header -->
            <div class="welcome-banner-premium">
                <div class="welcome-content">
                    <h1>Jai Hind, <span class="highlight-gold">${currentUser.name}!</span></h1>
                    <p>Selection is a journey of discipline. Your path to excellence starts here.</p>
                    <div class="dashboard-stats-row">
                        <div class="d-stat">
                            <span class="d-label">STREAK 🔥</span>
                            <span class="d-value">${currentUser.stats.streak} Days</span>
                        </div>
                        <div class="d-stat">
                            <span class="d-label">TOTAL XP ⭐</span>
                            <span class="d-value">${currentUser.stats.xp}</span>
                        </div>
                        <div class="d-stat">
                            <span class="d-label">ATTENDANCE</span>
                            <span class="d-value">${currentUser.stats.attendance}%</span>
                        </div>
                    </div>
                </div>
                <div class="welcome-visual">🏆</div>
            </div>


            <!-- Main Dashboard Grid -->
            <div class="premium-dashboard-grid">
                <!-- Primary Column -->
                <div class="d-main-col">
                    <h3 class="section-subtitle">CONTINUE LEARNING</h3>
                    ${activeBatches.length > 0 ? `
                        <div class="resume-card-premium">
                            <div style="background:#000; border-radius:16px; width:220px; height:140px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                <img src="${activeBatches[0].image}" class="resume-img" style="width:100%; height:100%; object-fit:contain;">
                            </div>
                            <div class="resume-info">
                                <span class="badge-status">IN PROGRESS</span>
                                <h2>${activeBatches[0].title}</h2>
                                <p>${activeBatches[0].target}</p>
                                <div class="resume-progress">
                                    <div class="p-bar-bg"><div class="p-bar-fill" style="width:45%"></div></div>
                                    <span class="p-text">Course progress tracked by completions</span>
                                </div>
                                <button class="btn btn-primary" onclick="window.portal.openBatch('${activeBatches[0].id}')">RESUME CLASS</button>
                            </div>
                        </div>
                    ` : `
                        <div class="admin-card placeholder-card">
                            <p>No active courses. Explore our batches to start your preparation!</p>
                            <button class="btn btn-outline" onclick="window.portal.renderSection('browse-batches')">Browse Batches</button>
                        </div>
                    `}
                </div>
                <!-- Secondary Column -->
                <div class="d-side-col">
                    <h3 class="section-subtitle">RECENTLY ENROLLED</h3>
                    <div class="mini-batch-list">
                        ${activeBatches.slice(1, 4).map(b => `
                            <div class="mini-batch-card" onclick="window.portal.openBatch('${b.id}')">
                                <div class="m-icon">📚</div>
                                <div class="m-info">
                                    <h4>${b.title}</h4>
                                    <span>${b.category}</span>
                                </div>
                                <span class="m-arrow">→</span>
                            </div>
                        `).join('') || '<p style="color:#444; font-size:12px;">Enroll in more batches to see them here.</p>'}
                    </div>
                    <div class="selection-quote-card">
                        <p>"${getDailyQuote()}"</p>
                        <span class="quote-author">- Niti Kavya Academy</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBatches() {
    // Get fresh batch data
    const activeBatches = currentUser.enrolledBatches.map(ub => {
        const fresh = ALL_BATCH_CATALOG.find(b => b.id === ub.id);
        return fresh ? { ...ub, ...fresh } : ub;
    }).filter(b => b);

    portalContent.innerHTML = `
        <h2 class="section-title">My Learning Path</h2>
        <div class="resource-grid" style="margin-top:20px;">
            ${activeBatches.map(b => `
                <div class="admin-card">
                    <div style="width:100%; height:180px; background:#000; border-radius:12px; margin-bottom:15px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <img src="${b.image}" style="width:100%; height:100%; object-fit:contain;">
                    </div>
                    <h3>${b.title}</h3>
                    <p style="font-size:12px; color:#888;">${b.target}</p>
                    <button class="btn btn-primary full-width" style="margin-top:20px; font-weight:800;" onclick="window.portal.openBatch('${b.id}')">LET'S STUDY</button>
                </div>
            `).join('') || '<p class="description">You are not enrolled in any batches yet. Go to Browse All Batches to start!</p>'}
        </div>
    `;
}

function renderCatalog() {
    portalContent.innerHTML = `
        <h2 class="section-title">Available Programs</h2>
        <div class="resource-grid" style="margin-top:20px;">
            ${ALL_BATCH_CATALOG.map(batch => {
        const isEnrolled = currentUser.enrolledBatches.some(b => b.id === batch.id);
        if (isEnrolled) return '';
        return `
                    <div class="admin-card">
                        <img src="${batch.image}" style="width:100%; height:120px; object-fit:cover; border-radius:10px; margin-bottom:15px;">
                        <h3>${batch.title}</h3>
                        <p style="font-size:12px; color:#888; margin:5px 0;">${batch.category} | ${batch.price}</p>
                        <button class="btn btn-primary full-width" style="margin-top:15px;" onclick="window.portal.enrollInBatch('${batch.id}')">Enroll Now</button>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

window.portal = {
    renderSection,
    saveProfile: () => {
        const name = document.getElementById('p-name').value;
        const phone = document.getElementById('p-phone').value;
        const goal = document.getElementById('p-goal').value;
        const bio = document.getElementById('p-bio').value;

        if (name) currentUser.name = name;
        currentUser.phone = phone;
        currentUser.goal = goal;
        currentUser.bio = bio;

        saveUser();
        updateUserUI(); // Update sidebar name instantly
        alert("Profile updated successfully! 🚀");
    },

    showModal: (content) => {
        let overlay = document.querySelector('.premium-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'premium-modal-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
                z-index: 10000; display: flex; align-items: center; justify-content: center;
                animation: fadeIn 0.3s ease;
            `;
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div class="premium-modal-card" style="
                background: #0d0d0d; border: 1px solid rgba(255, 107, 0, 0.2); 
                border-radius: 24px; padding: 40px; max-width: 480px; width: 90%; 
                text-align: center; box-shadow: 0 0 50px rgba(255, 107, 0, 0.1);
                animation: slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            ">
                ${content}
            </div>
        `;
    },

    hideModal: () => {
        const overlay = document.querySelector('.premium-modal-overlay');
        if (overlay) overlay.remove();
    },

    openVerifyModal: async () => {
        const email = currentUser.email;
        if (!email) return alert("Please login first.");

        window.portal.showModal(`
            <div style="font-size: 40px; margin-bottom: 20px; animation: bounce 1s infinite;">📩</div>
            <h2 style="margin-bottom: 10px;">Sending Verification Code...</h2>
            <p style="color: #888;">Please wait while we send a secure OTP to<br><span style="color: white;">${email}</span></p>
        `);

        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (data.success) {
                window.verificationHash = data.hash; // Store for verify step
                window.portal.showModal(`
                    <div style="font-size: 40px; margin-bottom: 20px;">🔐</div>
                    <h2 style="margin-bottom: 10px;">Enter Verification Code</h2>
                    <p style="color: #888; margin-bottom: 30px;">We've sent a 6-digit code to <strong>${email}</strong></p>
                    
                    <input type="text" id="otp-input" placeholder="0 0 0 0 0 0" maxlength="6" style="
                        background: #1a1a1a; border: 1px solid #333; color: white; 
                        font-size: 24px; letter-spacing: 10px; text-align: center; 
                        padding: 15px; border-radius: 12px; width: 100%; margin-bottom: 25px; outline: none;
                        transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='#333'">
                    
                    <div style="display: flex; gap: 15px;">
                        <button class="btn btn-outline full-width" onclick="window.portal.hideModal()">Cancel</button>
                        <button class="btn btn-primary full-width" onclick="window.portal.verifyOTP(document.getElementById('otp-input').value)">Verify Now</button>
                    </div>
                `);
                document.getElementById('otp-input').focus();
            } else {
                window.portal.showModal(`
                    <div style="font-size: 40px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="margin-bottom: 10px; color: #ff4444;">Failed to Send OTP</h2>
                    <p style="color: #ccc; margin-bottom: 30px;">${data.message}</p>
                    <button class="btn btn-primary full-width" onclick="window.portal.hideModal()">Close</button>
                `);
            }
        } catch (error) {
            console.error("OTP Error:", error);
            window.portal.showModal(`
                <div style="font-size: 40px; margin-bottom: 20px;">🔌</div>
                <h2 style="margin-bottom: 10px; color: #ff4444;">Connection Error</h2>
                <p style="color: #ccc; margin-bottom: 30px;">Could not connect to server. Please check your internet.</p>
                <button class="btn btn-primary full-width" onclick="window.portal.hideModal()">Close</button>
            `);
        }
    },

    verifyOTP: async (code) => {
        if (!code || code.length !== 6) return alert("Please enter a valid 6-digit code");

        window.portal.showModal(`
            <div style="font-size: 40px; margin-bottom: 20px; animation: spin 1s linear infinite;">⏳</div>
            <h2 style="margin-bottom: 10px;">Verifying Code...</h2>
        `);

        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser.email,
                    otp: code,
                    hash: window.verificationHash || '' // Send hash back
                })
            });
            const data = await response.json();

            if (data.success) {
                currentUser.verified = true;
                saveUser();
                window.portal.showModal(`
                    <div style="font-size: 40px; margin-bottom: 20px;">🎉</div>
                    <h2 style="margin-bottom: 10px; color: #4CAF50;">Verification Successful!</h2>
                    <p style="color: #ccc; margin-bottom: 30px;">Your email has been verified. You now have full access.</p>
                    <button class="btn btn-primary full-width" onclick="location.reload()">Continue to Dashboard</button>
                `);
            } else {
                window.portal.showModal(`
                    <div style="font-size: 40px; margin-bottom: 20px;">❌</div>
                    <h2 style="margin-bottom: 10px; color: #ff4444;">Invalid Code</h2>
                    <p style="color: #ccc; margin-bottom: 30px;">The code you entered is incorrect. Please try again.</p>
                    <button class="btn btn-outline full-width" onclick="window.portal.openVerifyModal()">Try Again</button>
                `);
            }
        } catch (error) {
            console.error("Verification Error:", error);
            window.portal.showModal(`<h2>Error</h2><p>Connection failed.</p><button class="btn btn-primary" onclick="window.portal.hideModal()">Close</button>`);
        }
    },

    openBatch: (batchId) => {
        const batch = ALL_BATCH_CATALOG.find(b => b.id === batchId);
        portalContent.innerHTML = `
            <div class="batch-detail-header">
                <button class="btn btn-sm btn-outline back-btn" onclick="window.portal.renderSection('my-batches')">
                    <span style="margin-right:8px;">←</span> BACK TO DASHBOARD
                </button>
                <h1 style="margin: 30px 0 10px 0; font-size: 32px; font-weight: 900;">${batch.title}</h1>
                <p style="color: #666; margin-bottom: 30px;">${batch.target} | Mission Selection 2026</p>
                
                <div class="premium-tabs">
                    <button class="p-tab active" id="tab-classroom" onclick="window.portal.switchBatchTab('classroom')">
                        <span class="tab-icon">📺</span> CLASSROOM
                    </button>
                    <button class="p-tab" id="tab-notes" onclick="window.portal.switchBatchTab('notes')">
                        <span class="tab-icon">📄</span> STUDY NOTES
                    </button>
                    <button class="p-tab" id="tab-dpp" onclick="window.portal.switchBatchTab('dpp')">
                        <span class="tab-icon">📝</span> PRACTICE (DPP)
                    </button>
                </div>
            </div>

            <div id="classroom-view" class="batch-tab-content" style="margin-top:40px;">
                <div class="video-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:25px;">
                    ${batch.classes?.map((cls, idx) => {
            if (!cls.youtubeId) return '';

            // Smart Thumbnail Logic
            let videoId = cls.youtubeId;
            const match = videoId.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
            if (match && match[2].length === 11) videoId = match[2];

            let thumb = cls.thumbnail;
            if (thumb && thumb.includes('drive.google.com')) {
                const driveMatch = thumb.match(/\/d\/(.*?)\//);
                if (driveMatch && driveMatch[1]) {
                    thumb = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
                }
            }
            if (!thumb) thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            return `
                        <div class="lecture-card" onclick="window.portal.playVideo('${batchId}', ${idx})" style="cursor:pointer;">
                            <div class="lecture-preview" style="background: #000; border-radius: 12px; height: 180px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); group;">
                                <img src="${thumb}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.5s; opacity:0.9;" onmouseover="this.style.transform='scale(1.1)'; this.style.opacity='1'" onmouseout="this.style.transform='scale(1)'; this.style.opacity='0.9'">
                                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:50px; height:50px; background:rgba(0,0,0,0.7); border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 20px rgba(0,0,0,0.5);">
                                    <span style="font-size:20px; color:white; margin-left:4px;">▶</span>
                                </div>
                            </div>
                            <div style="padding: 20px 0;">
                                <h3 style="font-size: 16px; margin-bottom: 10px; font-weight:700;">${cls.title}</h3>
                                <div style="display: flex; gap: 12px;">
                                    <button class="btn btn-sm btn-primary full-width">▶ START LEARNING</button>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('') || '<div class="admin-card">Lectures will start appearing soon.</div>'}
                </div>
            </div>

            <div id="notes-view" class="batch-tab-content" style="display:none; margin-top:40px;">
                <div class="notes-list" style="display: grid; gap: 15px;">
                    ${batch.classes?.map((cls, idx) => {
            if (!cls.notes) return '';
            return `
                        <div class="resource-card" style="display: flex; justify-content: space-between; align-items: center; background: #0a0a0a; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); transition: 0.3s;">
                            <div style="display:flex; align-items:center; gap:20px;">
                                <div style="width:50px; height:50px; background: rgba(255,107,0,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--primary); font-size:24px;">📄</div>
                                <div>
                                    <h4 style="margin-bottom:5px;">Digital Notes: ${cls.title}</h4>
                                    <p style="font-size:12px; color:#666;">High-quality PDF resource for revision</p>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline" onclick="window.portal.viewNotes('${cls.notes}')">VIEW NOTES</button>
                        </div>
                    `;
        }).join('') || '<div class="admin-card">No notes uploaded yet.</div>'}
                </div>
            </div>

            <div id="dpp-view" class="batch-tab-content" style="display:none; margin-top:40px;">
                <div class="quiz-grid" style="display: grid; gap: 15px;">
                    ${batch.classes?.map((cls, idx) => {
            if (!cls.dpp_quiz || cls.dpp_quiz.length === 0) return '';
            return `
                        <div class="resource-card" style="display: flex; justify-content: space-between; align-items: center; background: #0a0a0a; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="display:flex; align-items:center; gap:20px;">
                                <div style="width:50px; height:50px; background: rgba(0,212,255,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#00d4ff; font-size:24px;">📝</div>
                                <div>
                                    <h4 style="margin-bottom:5px;">DPP Practice: ${cls.title}</h4>
                                    <p style="font-size:12px; color:#666;">${cls.dpp_quiz?.length || 0} Dynamic Questions</p>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="window.portal.startQuiz('${batchId}', ${idx})">
                                ATTEMPT QUIZ
                            </button>
                        </div>
                    `;
        }).join('') || '<div class="admin-card">DPPs will be updated soon.</div>'}
                </div>
            </div>
        `;
    },

    completeLecture: (batchId, clsIdx) => {
        const batch = ALL_BATCH_CATALOG.find(b => b.id === batchId);
        const cls = batch.classes[clsIdx];
        const lectureKey = `${batchId}_${clsIdx}`;

        if (!currentUser.completedLectures.includes(lectureKey)) {
            currentUser.completedLectures.push(lectureKey);
            window.portal.updateXP(10, "Lecture Completion");
            window.portal.updateAttendance();
            window.portal.updateStreak();
            saveUser();
            alert("Congratulations! +10 XP earned for completing this lecture. Attendance marked.");
        }
    },

    updateXP: (amount, reason) => {
        currentUser.stats.xp += amount;
        saveUser();
    },

    updateAttendance: () => {
        // Attendance logic: Completed Lectures / Total Lectures across all batches
        let totalClasses = 0;
        currentUser.enrolledBatches.forEach(b => totalClasses += b.classes?.length || 0);
        if (totalClasses === 0) return;
        currentUser.stats.attendance = Math.round((currentUser.completedLectures.length / totalClasses) * 100);
        saveUser();
    },

    updateStreak: () => {
        const today = new Date().toDateString();
        if (currentUser.lastActivityDate !== today) {
            const last = currentUser.lastActivityDate ? new Date(currentUser.lastActivityDate) : null;
            const yest = new Date();
            yest.setDate(yest.getDate() - 1);

            if (last && last.toDateString() === yest.toDateString()) {
                currentUser.stats.streak++;
            } else {
                currentUser.stats.streak = 1;
            }
            currentUser.lastActivityDate = today;
            saveUser();
        }
    },

    switchBatchTab: (tab) => {
        document.querySelectorAll('.batch-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.p-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(`${tab}-view`).style.display = 'block';
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    viewNotes: (link) => {
        if (!link || link === 'undefined' || link === 'null') return alert("Pehle admin upload kare.");
        window.open(link, '_blank');
    },

    startQuiz: (batchId, clsIdx) => {
        const batch = ALL_BATCH_CATALOG.find(b => b.id === batchId);
        const cls = batch.classes[clsIdx];
        quizState = { questions: cls.dpp_quiz, currentIdx: 0, score: 0, answers: [], isFinished: false };
        renderQuizInterface();
    },

    submitAnswer: (idx) => {
        const q = quizState.questions[quizState.currentIdx];
        quizState.answers[quizState.currentIdx] = idx;
        if (idx === q.correct) quizState.score++;

        if (quizState.currentIdx < quizState.questions.length - 1) {
            quizState.currentIdx++;
            renderQuizInterface();
        } else {
            quizState.isFinished = true;
            renderQuizResults();
        }
    },

    enrollInBatch: (batchId) => {
        const batch = ALL_BATCH_CATALOG.find(b => b.id === batchId);
        if (!batch) return;

        currentUser.enrolledBatches.push(batch);
        saveUser();
        alert(`Successfully enrolled in ${batch.title}!`);
        window.portal.renderSection('my-batches');
    },

    playVideo: (batchId, clsIdx) => {
        const batch = ALL_BATCH_CATALOG.find(b => b.id === batchId);
        const cls = batch.classes[clsIdx];

        // Auto-extract ID if full URL is pasted
        let videoId = cls.youtubeId;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = videoId.match(regExp);
        if (match && match[2].length === 11) {
            videoId = match[2];
        }

        portalContent.innerHTML = `
            <div class="video-player-interface" style="animation:fadeIn 0.5s;">
                <button class="back-btn-pill" onclick="window.portal.openBatch('${batchId}')">
                    <span>←</span> BACK TO CLASSROOM
                </button>
                <div class="theater-layout">
                    <!-- Main Player Area -->
                    <div>
                        <div class="player-wrapper">
                            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                        </div>
                        <div class="video-header-row">
                            <div>
                                <h1 class="video-title">${cls.title}</h1>
                                <div class="video-meta">
                                    <span>${batch.title}</span>
                                    <span style="opacity:0.3">•</span>
                                    <span>Lecture ${clsIdx + 1}</span>
                                </div>
                            </div>
                            <button class="mark-complete-btn" onclick="window.portal.completeLecture('${batchId}', ${clsIdx})">
                                <span>✅</span> MARK COMPLETED (+10 XP)
                            </button>
                        </div>
                    </div>

                    <!-- Doubt & Interaction Area -->
                    <div class="doubt-section">
                        <div class="doubt-header">
                            <div class="doubt-status"></div>
                            <h3>Live Doubt Support</h3>
                        </div>
                        <div class="doubt-body">
                            <div class="empty-state-icon">🤔</div>
                            <p class="empty-state-text">Got a question during the lecture?<br>Ask your dedicated mentor here.</p>
                        </div>
                        <div class="doubt-input-area">
                            <textarea class="doubt-textarea" rows="3" placeholder="Type your doubt here..."></textarea>
                            <button class="send-doubt-btn">SEND TO MENTOR</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

function renderQuizInterface() {
    const q = quizState.questions[quizState.currentIdx];
    portalContent.innerHTML = `
        <div class="admin-card" style="max-width:600px; margin: 40px auto;">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <span>Question ${quizState.currentIdx + 1} of ${quizState.questions.length}</span>
                <span class="badge">DPP Session</span>
            </div>
            <h2 style="margin-bottom:25px;">${q.q}</h2>
            <div style="display:grid; gap:12px;">
                ${q.options.map((opt, i) => `
                    <button class="btn btn-outline full-width" style="text-align:left; padding:15px;" onclick="window.portal.submitAnswer(${i})">${i + 1}. ${opt}</button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderQuizResults() {
    portalContent.innerHTML = `
        <div class="test-result-premium" style="max-width:500px; margin: 60px auto; text-align:center; background: #0d0d0d; border-radius: 30px; padding: 50px; border: 1px solid var(--primary);">
            <div style="font-size:60px; margin-bottom:20px;">🏆</div>
            <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 10px;">DPP COMPLETED!</h2>
            <p style="margin:20px 0; font-size: 18px;">Your Score: <span class="highlight-gold" style="font-size:32px; font-weight: 900;">${quizState.score} / ${quizState.questions.length}</span></p>
            <div style="background: rgba(255,107,0,0.1); padding: 15px; border-radius: 12px; margin-bottom: 30px;">
                <p style="color:var(--primary); font-weight:900; letter-spacing: 1px;">+10 XP EARNED ⭐</p>
                <p style="font-size: 12px; color: #666;">Keep practicing to climb the leaderboard!</p>
            </div>
            <button class="btn btn-primary full-width" onclick="window.portal.updateXP(10, 'DPP Completion'); window.portal.updateStreak(); window.portal.renderSection('my-batches');">RETURN TO CLASSROOM</button>
        </div>
    `;
}

function renderProfile() {
    portalContent.innerHTML = `
        <div class="profile-container" style="max-width: 800px; margin: 0 auto;">
            <div class="sidebar-header" style="text-align:center; padding: 40px 0; border:none;">
                <div style="position:relative; display:inline-block;">
                    <img src="${currentUser.avatar}" style="width:120px; height:120px; border-radius:50%; border:4px solid var(--primary); box-shadow: 0 0 30px rgba(255,107,0,0.2);">
                    <button class="btn-icon" style="position:absolute; bottom:0; right:0; background:#111; border:1px solid #333; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="alert('Avatar upload coming soon!')">✏️</button>
                </div>
                <h1 style="margin-top:20px; font-size:32px;">${currentUser.name}</h1>
                <p style="color:var(--primary); font-weight:700; letter-spacing:1px;">${currentUser.role.toUpperCase()} • LEVEL ${Math.floor(currentUser.stats.xp / 100) + 1}</p>
            </div>

            <div class="admin-card">
                <h3 style="margin-bottom:25px; border-bottom:1px solid #222; padding-bottom:15px;">Personal Details</h3>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <div class="edit-form-group">
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:8px;">Full Name</label>
                        <input type="text" id="p-name" value="${currentUser.name}" style="width:100%; padding:12px; background:#111; border:1px solid #222; color:white; border-radius:8px;">
                    </div>
                    <div class="edit-form-group">
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:8px;">Email Address</label>
                        <div style="display:flex; gap:10px;">
                            <input type="text" value="${currentUser.email}" disabled style="flex:1; padding:12px; background:#080808; border:1px solid #222; color:#666; border-radius:8px; cursor:not-allowed;">
                            ${!currentUser.verified ? `
                                <button class="btn btn-sm btn-outline" style="border-color:var(--primary); color:var(--primary);" onclick="window.portal.openVerifyModal()">Verify</button>
                            ` : `
                                <button class="btn btn-sm btn-outline" style="border-color:#4CAF50; color:#4CAF50; cursor:default;">Verified ✅</button>
                            `}
                        </div>
                    </div>
                    <div class="edit-form-group">
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:8px;">Phone Number</label>
                        <input type="text" id="p-phone" value="${currentUser.phone || ''}" placeholder="+91 XXXXX XXXXX" style="width:100%; padding:12px; background:#111; border:1px solid #222; color:white; border-radius:8px;">
                    </div>
                    <div class="edit-form-group">
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:8px;">Target Exam</label>
                        <select id="p-goal" style="width:100%; padding:12px; background:#111; border:1px solid #222; color:white; border-radius:8px;">
                            <option value="UPSC" ${currentUser.goal === 'UPSC' ? 'selected' : ''}>UPSC CSE</option>
                            <option value="SSC" ${currentUser.goal === 'SSC' ? 'selected' : ''}>SSC CGL/CHSL</option>
                            <option value="State PSC" ${currentUser.goal === 'State PSC' ? 'selected' : ''}>State PSC</option>
                            <option value="Railways" ${currentUser.goal === 'Railways' ? 'selected' : ''}>Railways RRB</option>
                            <option value="Other" ${currentUser.goal === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                </div>

                <div class="edit-form-group" style="margin-top:20px;">
                    <label style="display:block; color:#888; font-size:12px; margin-bottom:8px;">Bio / Motivation</label>
                    <textarea id="p-bio" rows="3" placeholder="Write your goal or motivation here..." style="width:100%; padding:12px; background:#111; border:1px solid #222; color:white; border-radius:8px;">${currentUser.bio || ''}</textarea>
                </div>

                <div style="margin-top:30px; display:flex; gap:15px; justify-content:flex-end;">
                    <button class="btn btn-outline" onclick="window.portal.renderSection('dashboard')">Cancel</button>
                    <button class="btn btn-primary" onclick="window.portal.saveProfile()">Save Changes</button>
                </div>
            </div>
        </div>
    `;
}

function renderLeaderboard() {
    const users = JSON.parse(localStorage.getItem('nitikavya_users') || '{}');
    // Sort by XP (descending), then by streak as a tie-breaker
    const sortedUsers = Object.values(users).sort((a, b) => {
        const xpA = a.stats?.xp || 0;
        const xpB = b.stats?.xp || 0;
        if (xpB !== xpA) return xpB - xpA;
        return (b.stats?.streak || 0) - (a.stats?.streak || 0);
    });

    portalContent.innerHTML = `
        <h2 class="section-title">Global Warrior Leaderboard</h2>
        <div class="admin-card" style="margin-top:20px; padding:0; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background: rgba(255,107,0,0.1);">
                    <tr>
                        <th style="padding:15px; text-align:left;">Rank</th>
                        <th style="padding:15px; text-align:left;">Soldier</th>
                        <th style="padding:15px; text-align:left;">Target Batch</th>
                        <th style="padding:15px; text-align:left;">Streak</th>
                        <th style="padding:15px; text-align:left;">Total XP</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedUsers.length > 0 ? sortedUsers.map((u, i) => `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05); ${u.email === currentUser.email ? 'background: rgba(255,107,0,0.05);' : ''}">
                            <td style="padding:15px;">
                                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                            </td>
                            <td style="padding:15px; display:flex; align-items:center; gap:10px;">
                                <img src="${u.avatar}" style="width:30px; height:30px; border-radius:50%; border: 1px solid rgba(255,255,255,0.1);">
                                <div>
                                    <div style="font-weight:700; color: ${u.email === currentUser.email ? 'var(--primary)' : 'white'};">${u.name} ${u.email === currentUser.email ? '(You)' : ''}</div>
                                    <div style="font-size:10px; color:#666;">Level ${Math.floor((u.stats?.xp || 0) / 100) + 1} Aspirant</div>
                                </div>
                            </td>
                            <td style="padding:15px; font-size:12px; color:#888;">${u.goal || 'General GS'}</td>
                            <td style="padding:15px;">🔥 ${u.stats?.streak || 0}</td>
                            <td style="padding:15px; font-weight:900; color:var(--primary);">${u.stats?.xp || 0} XP</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="padding:40px; text-align:center; color:#666;">No recruits found in the database yet.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderAdminManagedSection(title, storageKey) {
    const data = JSON.parse(localStorage.getItem(`nitikavya_${storageKey}`)) || [];

    // Inject Verification Alert for Announcements
    let verificationHtml = '';
    if (storageKey === 'announcements' && !currentUser.verified) {
        verificationHtml = `
            <div class="resource-card" style="background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="color: #ff6666; margin-bottom:5px;">⚠️ Pending Action: Verify Email</h4>
                        <p style="font-size:12px; color:#ccc;">Secure your account by verifying your email address.</p>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="window.portal.openVerifyModal()">VERIFY</button>
                </div>
            </div>
        `;
    }

    portalContent.innerHTML = `
        <h2 class="section-title">${title}</h2>
        <div class="resource-grid" style="margin-top:20px;">
            ${verificationHtml}
            ${data.length > 0 ? data.map(item => `
                <div class="resource-card" style="${item.pinned ? 'background:rgba(255,107,0,0.15); border:1px solid var(--primary);' : 'background:#0a0a0a; border:1px solid rgba(255,255,255,0.05);'} padding:20px; border-radius:12px; margin-bottom:10px;">
                    <h4 style="${item.pinned ? 'color:var(--primary); font-weight:900;' : ''}">${item.pinned ? '📌 ' : ''}${item.title || item.name}</h4>
                    <p style="font-size:12px; color:#ccc; margin:10px 0;">${item.description || 'Admin updated resource'}</p>
                    ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-sm btn-outline">OPEN LINK</a>` : ''}
                    <div style="font-size:10px; color:#666; margin-top:10px; text-align:right;">${item.date || ''}</div>
                </div>
            `).join('') : `<div class="admin-card">Coming soon... Waiting for admin to upload ${title}.</div>`}
        </div>
    `;
}

function initCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    if (!cursor) return;
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
        follower.style.left = e.clientX + 'px'; follower.style.top = e.clientY + 'px';
    });
}
