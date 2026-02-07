// Kursus Data - Sync with Admin Catalog
import { auth, googleProvider, signInWithPopup } from "./firebase-config.js";

const DEFAULT_CATALOG = [
    { id: 'free-youtube-2026', title: "Mission Selection 2026", category: "YOUTUBE", instructor: "S.S. DUBEY", price: "FREE", image: "assets/youtube-poster.jpg", badge: "FREE BATCH", badgeClass: "badge-primary" },
    { id: 'upsc-2026', title: "UPSC GS: Foundation 2026", category: "UPSC", instructor: "S.S. DUBEY", price: "₹14,999", image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=800", badge: "STARTS SOON", badgeClass: "badge-primary" },
    { id: 'ssc-brahmastra', title: "SSC CGL: Brahmastra Batch", category: "SSC", instructor: "S.S. DUBEY", price: "₹2,499", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800", badge: "Bestseller", badgeClass: "badge-gold" }
];

const courses = JSON.parse(localStorage.getItem('nitikavya_catalog')) || DEFAULT_CATALOG;

// Auto-sync with Admin changes in other tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'nitikavya_catalog') {
        const updatedCourses = JSON.parse(e.newValue);
        if (courseGrid) renderCourses(updatedCourses);
    }
});
const courseGrid = document.getElementById('course-grid');
const header = document.getElementById('main-header');
const filterBtns = document.querySelectorAll('.filter-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (courseGrid) renderCourses(courses);
    setupEventListeners();
    handleHeaderScroll();
    initRevealAnimations();
    initCustomCursor();
    initAuthModal();
});

// Render Courses
function renderCourses(coursesToRender) {
    if (!courseGrid) return;
    courseGrid.innerHTML = '';

    coursesToRender.forEach(course => {
        const courseEl = document.createElement('div');
        courseEl.className = 'course-card reveal';
        courseEl.innerHTML = `
            <div class="course-img-wrapper">
                ${course.badge ? `<div class="course-badges"><span class="badge ${course.badgeClass || 'badge-primary'}">${course.badge}</span></div>` : ''}
                <img src="${course.image}" alt="${course.title}" class="course-img">
            </div>
            <div class="course-info">
                <p class="course-category">${course.category}</p>
                <h3 class="course-title">${course.title}</h3>
                <p class="course-instructor">MASTERED BY <span>S.S. DUBEY</span></p>
                <div class="course-footer">
                    <p class="course-price">${course.price}</p>
                </div>
            </div>
        `;
        courseGrid.appendChild(courseEl);
    });
    // Re-init reveal for newly added cards
    setTimeout(initRevealAnimations, 100);
}

// Event Listeners
function setupEventListeners() {
    mobileMenuBtn?.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;

            const filtered = filter === 'all' ? courses : courses.filter(c => c.category === filter);
            renderCourses(filtered);
        });
    });

    // Smooth scroll
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (!targetSection) return;

            window.scrollTo({
                top: targetSection.offsetTop - 80,
                behavior: 'smooth'
            });

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Header Scroll
function handleHeaderScroll() {
    window.addEventListener('scroll', () => {
        if (!header) return;
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Reveal Animations
function initRevealAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => observer.observe(el));
}

// Custom Cursor
function initCustomCursor() {
    if (!cursor || !follower) return;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';

        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    });

    const hoverElements = document.querySelectorAll('a, button, .course-card, .mentor-card');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.width = '80px';
            cursor.style.height = '80px';
            cursor.style.background = 'rgba(255, 107, 0, 0.1)';
            cursor.style.border = '1px solid var(--primary)';
            cursor.classList.add('hovering');
        });
        el.addEventListener('mouseleave', () => {
            cursor.style.width = '25px';
            cursor.style.height = '25px';
            cursor.style.background = 'transparent';
            cursor.style.border = '2px solid var(--primary)';
            cursor.classList.remove('hovering');
        });
    });
}

// Auth & Checkout Modal Logic
let selectedBatchForCheckout = null;

function initAuthModal() {
    const authModal = document.getElementById('auth-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeBtns = document.querySelectorAll('.close-modal');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    const googleBtn = document.getElementById('google-login-btn');
    const payNowBtn = document.getElementById('pay-now-btn');

    // Global enrollment trigger handler
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.auth-trigger, .btn-enroll-trigger, .btn-outline');
        if (!trigger) return;

        // Skip if it is a back button or ignore trigger
        if (trigger.innerText.includes('←') || trigger.classList.contains('yt-btn')) return;

        const email = localStorage.getItem('loggedUser');

        // Find batch context
        const card = trigger.closest('.course-card');
        const isEnrollment = trigger.classList.contains('auth-trigger') || trigger.classList.contains('btn-enroll-trigger');

        const batchId = card ? courses.find(c => c.title === card.querySelector('.course-title').innerText)?.id : 'free-youtube-2026';
        selectedBatchForCheckout = courses.find(b => b.id === batchId);

        if (!email) {
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            if (isEnrollment) {
                showCheckoutModal();
            } else {
                window.location.href = 'portal.html';
            }
        }
    });

    function showCheckoutModal() {
        if (!selectedBatchForCheckout) return;

        const summaryContent = document.getElementById('checkout-summary-content');
        const totalPriceEl = document.getElementById('checkout-total-price');

        summaryContent.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: start; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <img src="${selectedBatchForCheckout.image}" style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover;">
                <div>
                    <h4 style="font-size: 16px; margin-bottom: 5px;">${selectedBatchForCheckout.title}</h4>
                    <p style="font-size: 12px; color: #666;">Category: ${selectedBatchForCheckout.category}</p>
                    <p style="font-size: 14px; color: var(--primary); font-weight: 700; margin-top: 10px;">${selectedBatchForCheckout.price}</p>
                </div>
            </div>
            <div style="margin-top: 20px; font-size: 13px; color: #aaa;">
                <p>✅ Full Lifetime Access</p>
                <p>✅ Personalized Progress Tracking</p>
                <p>✅ Downloadable Resources & PDFs</p>
            </div>
        `;

        totalPriceEl.innerText = selectedBatchForCheckout.price;
        checkoutModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    payNowBtn?.addEventListener('click', () => {
        const email = localStorage.getItem('loggedUser');
        let users = JSON.parse(localStorage.getItem('nitikavya_users') || '{}');

        if (!users[email]) {
            // Ensure student profile exists
            users[email] = {
                name: email.split('@')[0],
                email: email,
                enrolledBatches: [],
                testHistory: [],
                stats: { attendance: "0%", testsDone: 0, rank: "TBD" }
            };
        }

        // Check if already enrolled
        const isEnrolled = users[email].enrolledBatches.some(b => b.id === selectedBatchForCheckout.id);

        if (!isEnrolled) {
            users[email].enrolledBatches.push({
                ...selectedBatchForCheckout,
                progress: 0
            });
            localStorage.setItem('nitikavya_users', JSON.stringify(users));
        }

        payNowBtn.innerText = "ENROLLING...";
        payNowBtn.disabled = true;

        setTimeout(() => {
            window.location.href = 'portal.html';
        }, 1500);
    });

    closeBtns.forEach(btn => {
        btn.onclick = () => {
            authModal.classList.remove('active');
            checkoutModal.classList.remove('active');
            document.body.style.overflow = 'visible';
        };
    });

    // Handle Google Login
    googleBtn?.addEventListener('click', async () => {
        try {
            console.log("Starting Google Sign-In...");
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            if (user.email) {
                localStorage.setItem('loggedUser', user.email);
                googleBtn.innerHTML = '<span>AUTHENTICATED...</span>';
                googleBtn.disabled = true;

                setTimeout(() => {
                    if (user.email === 'admin@nitikavya.com') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'portal.html';
                    }
                }, 1000);
            }
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            alert(`Login Fail: ${error.message}\n\nZaroori Step: Firebase Console mein 'Google' provider enable karein aur 'localhost' ko Authorized Domains mein add karein.`);
            googleBtn.disabled = false;
            googleBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>`;
        }
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${target}-form`) form.classList.add('active');
            });
        });
    });

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput ? emailInput.value : '';

            if (email) localStorage.setItem('loggedUser', email);

            authModal.classList.remove('active');
            document.body.style.overflow = 'visible';

            const btn = form.querySelector('button[type="submit"]');
            btn.innerText = 'ACCESS GRANTED...';
            btn.disabled = true;

            setTimeout(() => {
                // Secret Admin Access
                if (email === 'admin@nitikavya.com') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'portal.html';
                }
            }, 1000);
        });
    });
}
