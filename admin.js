// --- Admin Data Manager ---
import { db, doc, setDoc, collection, getDocs } from "./firebase-config.js";

// This handles the persistent state of the whole website

const DEFAULT_CATALOG = [
    {
        id: 'free-youtube-2026',
        title: "Mission Selection 2026",
        category: "YOUTUBE",
        target: "All Government Exams",
        icon: "▶️",
        price: "FREE",
        image: "assets/youtube-poster.jpg",
        isFree: true,
        description: "India's most comprehensive free batch for G.S. Targeted for SSC, UPSC, and Railways.",
        classes: [
            {
                title: "L1: Revolt of 1857", youtubeId: "example1",
                notes: "https://drive.google.com/example",
                dpp: null,
                dpp_quiz: [
                    { q: "Who led the Revolt of 1857 in Kanpur?", options: ["Nana Sahib", "Rani Lakshmibai", "Begum Hazrat Mahal", "Kunwar Singh"], correct: 0 }
                ]
            }
        ]
    }
];



let catalog = JSON.parse(localStorage.getItem('nitikavya_catalog')) || DEFAULT_CATALOG;

// Fetch Live Data from Cloud on Load
(async () => {
    try {
        const snapshot = await getDocs(collection(db, "batches"));
        if (!snapshot.empty) {
            let cloudBatches = [];
            snapshot.forEach(doc => cloudBatches.push(doc.data()));
            if (cloudBatches.length > 0) {
                catalog = cloudBatches;
                console.log("Loaded from Cloud DB:", catalog);
                // Also update local storage for offline use or speed
                localStorage.setItem('nitikavya_catalog', JSON.stringify(catalog));
                renderManageBatches();
            }
        }
    } catch (e) {
        console.error("Cloud Fetch Error:", e);
    }
})();

function saveCatalog() {
    localStorage.setItem('nitikavya_catalog', JSON.stringify(catalog));
}

// --- UI Logic ---
const adminContent = document.getElementById('admin-content');
const editModal = document.getElementById('edit-modal');
const modalFormContainer = document.getElementById('modal-form-container');
const modalTitle = document.getElementById('modal-title');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

let currentEditingId = null;

document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    renderManageBatches();
    setupSidebar();

    cancelBtn.onclick = () => editModal.classList.remove('active');
    saveBtn.onclick = handleSave;
});

function initCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    if (!cursor || !follower) return;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    });
}

function setupSidebar() {
    document.querySelectorAll('.admin-nav li').forEach(li => {
        li.onclick = () => {
            document.querySelectorAll('.admin-nav li').forEach(l => l.classList.remove('active'));
            li.classList.add('active');
            const section = li.dataset.section;
            document.getElementById('admin-section-title').innerText = li.innerText;
            if (section === 'manage-batches') renderManageBatches();
            if (section === 'manage-users') renderManageUsers();
            if (section === 'manage-announcements') renderAnnouncementsManager();
            if (section === 'site-config') renderSiteConfig();
        };
    });
}

function renderManageBatches() {
    adminContent.innerHTML = `
        <div class="admin-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Active Batches</h3>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-sm btn-outline" style="border-color:var(--admin-primary); color:var(--admin-primary);" onclick="window.admin.syncToCloud()">☁️ Sync to DB</button>
                    <button class="btn btn-sm btn-primary btn-admin" onclick="window.admin.openAddBatch()">+ Create New Batch</button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Batch Title</th>
                        <th>Category</th>
                        <th>Resources</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${catalog.map(batch => `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <img src="${batch.image || 'assets/default-course.jpg'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                                    <strong>${batch.title}</strong>
                                </div>
                            </td>
                            <td>${batch.category}</td>
                            <td>📺 ${batch.classes ? batch.classes.length : 0} Lectures</td>
                            <td>
                                <button class="btn btn-sm btn-admin" onclick="window.admin.openContentManager('${batch.id}')">Manage Content</button>
                                <button class="btn btn-sm btn-outline" onclick="window.admin.openEditBatch('${batch.id}')">⚙️</button>
                                <button class="btn btn-sm btn-outline red" onclick="window.admin.deleteBatch('${batch.id}')">×</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// --- Specialized Admin Handlers ---
window.admin = {
    renderManageBatches,

    syncToCloud: async () => {
        const btn = document.querySelector('button[onclick="window.admin.syncToCloud()"]');
        if (btn) btn.innerText = "⏳ Syncing...";
        try {
            for (const batch of catalog) {
                await setDoc(doc(db, "batches", batch.id), batch);
            }
            alert("Data successfully synced to Cloud Firestore! ✅");
        } catch (error) {
            console.error("Sync Failed:", error);
            alert("Sync Failed: " + error.message);
        } finally {
            if (btn) btn.innerText = "☁️ Sync to DB";
        }
    },

    openEditBatch: (id) => {
        const batch = catalog.find(b => b.id === id);
        currentEditingId = id;
        modalTitle.innerText = "Edit Batch Info";
        modalFormContainer.innerHTML = `
            <div class="edit-form-group"><label>Batch Title</label><input type="text" id="edit-title" value="${batch.title}"></div>
            <div class="edit-form-group"><label>Category</label><input type="text" id="edit-category" value="${batch.category}"></div>
            <div class="edit-form-group"><label>Price (FREE or ₹XXX)</label><input type="text" id="edit-price" value="${batch.price}"></div>
            <div class="edit-form-group">
                <label>Poster Image (URL or Upload < 1MB)</label>
                <div style="display:flex; gap:10px; align-items:center;">
                    <img id="img-preview" src="${batch.image || 'assets/default-course.jpg'}" style="width:80px; height:45px; object-fit:cover; border-radius:6px; border:1px solid #333;">
                    <div style="flex:1;">
                        <input type="text" id="edit-image" value="${batch.image}" oninput="document.getElementById('img-preview').src = this.value || 'assets/default-course.jpg'">
                        <input type="file" onchange="window.admin.handleFileUpload(this, 'edit-image', 'img-preview')" accept="image/*" style="margin-top:5px; font-size:12px;">
                    </div>
                </div>
            </div>
            <div class="edit-form-group"><label>Description</label><textarea id="edit-desc" rows="3">${batch.description}</textarea></div>
        `;
        editModal.classList.add('active');
        saveBtn.onclick = handleSave;
    },

    openAddBatch: () => {
        currentEditingId = 'new';
        modalTitle.innerText = "Create New Batch";
        modalFormContainer.innerHTML = `
            <div class="edit-form-group"><label>Title</label><input type="text" id="edit-title"></div>
            <div class="edit-form-group"><label>Category</label><input type="text" id="edit-category"></div>
            <div class="edit-form-group"><label>Price</label><input type="text" id="edit-price"></div>
            <div class="edit-form-group">
                <label>Poster</label>
                <div style="display:flex; gap:10px; align-items:center;">
                    <img id="img-preview" src="assets/default-course.jpg" style="width:80px; height:45px; object-fit:cover; border-radius:6px; border:1px solid #333;">
                    <div style="flex:1;">
                        <input type="text" id="edit-image" placeholder="Image URL" oninput="document.getElementById('img-preview').src = this.value || 'assets/default-course.jpg'">
                        <input type="file" onchange="window.admin.handleFileUpload(this, 'edit-image', 'img-preview')" accept="image/*" style="margin-top:5px; font-size:12px;">
                    </div>
                </div>
            </div>
            <div class="edit-form-group"><label>Description</label><textarea id="edit-desc" rows="3"></textarea></div>
        `;
        editModal.classList.add('active');
        saveBtn.onclick = handleSave;
    },

    handleFileUpload: (input, targetId, previewId = null) => {
        const file = input.files[0];
        if (file && file.size > 1024 * 1024) return alert("Pehle 1MB se chhoti file banayein!");
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(targetId).value = e.target.result;
            if (previewId && document.getElementById(previewId)) {
                document.getElementById(previewId).src = e.target.result;
            }
        };
        if (file) reader.readAsDataURL(file);
    },

    deleteBatch: (id) => { if (confirm("Delete this batch?")) { catalog = catalog.filter(b => b.id !== id); saveCatalog(); renderManageBatches(); } },

    openContentManager: (id) => {
        const batch = catalog.find(b => b.id === id);
        currentEditingId = id;
        adminContent.innerHTML = `
            <div class="admin-card">
                <button class="btn btn-sm btn-outline" onclick="window.admin.renderManageBatches()" style="margin-bottom:20px;">← Back to Batches</button>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <h2>Manage Content: ${batch.title}</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-sm btn-primary" onclick="window.admin.openAddResourceModal('${id}', 'video')">+ Add Video</button>
                        <button class="btn btn-sm btn-primary" onclick="window.admin.openAddResourceModal('${id}', 'note')">+ Add Note</button>
                        <button class="btn btn-sm btn-primary" onclick="window.admin.openAddResourceModal('${id}', 'dpp')">+ Add DPP</button>
                    </div>
                </div>
                <div class="content-list" style="margin-top:20px;">
                    ${batch.classes?.map((cls, idx) => {
            let typeLabel = [];
            if (cls.youtubeId) typeLabel.push("📺 VIDEO");
            if (cls.notes) typeLabel.push("📄 NOTE");
            if (cls.dpp_quiz && cls.dpp_quiz.length >= 0) typeLabel.push("📝 DPP");

            let color = "#666";
            if (cls.youtubeId) color = "#ff0000";
            else if (cls.notes) color = "#00d4ff";
            else if (cls.dpp_quiz) color = "#00ff00";

            return `
                <div class="admin-card" style="background:#080808; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            ${typeLabel.map(t => `<span style="font-size:9px; font-weight:900; background:#333; color:#fff; padding:2px 6px; border-radius:4px;">${t}</span>`).join('')}
                        </div>
                        <div>
                            <h4 style="margin:0;">${cls.title}</h4>
                            <p style="font-size:11px; color:#666; margin:0;">${cls.youtubeId || cls.notes || (cls.dpp_quiz ? cls.dpp_quiz.length + ' Qs' : 'No content')}</p>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        ${!cls.notes ? `<button class="btn btn-sm btn-outline" style="font-size:10px;" onclick="window.admin.openAttachResourceModal('${id}', ${idx}, 'note')">+ Note</button>` : ''}
                        ${!cls.dpp_quiz ? `<button class="btn btn-sm btn-outline" style="font-size:10px;" onclick="window.admin.openAttachResourceModal('${id}', ${idx}, 'dpp')">+ DPP</button>` : ''}
                        ${!cls.youtubeId ? `<button class="btn btn-sm btn-outline" style="font-size:10px;" onclick="window.admin.openAttachResourceModal('${id}', ${idx}, 'video')">+ Video</button>` : ''}
                        
                        ${(cls.dpp_quiz) ? `<button class="btn btn-sm btn-outline" onclick="window.admin.editQuiz('${id}', ${idx})">Edit Quiz</button>` : ''}
                        <button class="btn btn-sm btn-outline" onclick="window.admin.openEditResourceModal('${id}', ${idx})">Edit</button>
                        <button class="btn btn-sm btn-outline red" onclick="window.admin.deleteClass('${id}', ${idx})">×</button>
                    </div>
                </div>
            `;
        }).join('') || '<p>No content uploaded yet.</p>'}
                </div>
            </div>
        `;
    },

    openAddResourceModal: (batchId, type) => {
        const typeNames = { video: "Video Lecture", note: "PDF Note", dpp: "Daily Practice Problem (DPP)" };
        modalTitle.innerText = `Add New ${typeNames[type]}`;

        let fields = `<div class="edit-form-group"><label>Title</label><input type="text" id="res-title"></div>`;

        if (type === 'video') {
            fields += `
                <div class="edit-form-group"><label>YouTube Video ID (e.g. dQw4w9WgXcQ)</label><input type="text" id="res-ytid"></div>
                <div class="edit-form-group">
                    <label>Custom Thumbnail (Optional)</label>
                    <input type="text" id="res-thumb" placeholder="Image URL">
                    <input type="file" onchange="window.admin.handleFileUpload(this, 'res-thumb')" accept="image/*" style="margin-top:5px; font-size:12px;">
                </div>`;
        } else if (type === 'note') {
            fields += `
                <div class="edit-form-group">
                    <label>PDF Link (Drive/Cloud)</label>
                    <input type="text" id="res-link" placeholder="https://...">
                    <input type="file" onchange="window.admin.handleFileUpload(this, 'res-link')" accept=".pdf" style="margin-top:5px; font-size:12px;">
                </div>`;
        } else if (type === 'dpp') {
            fields += `<p style="font-size:12px; color:#888;">You can add questions after creating this DPP item.</p>`;
        }

        modalFormContainer.innerHTML = fields;
        editModal.classList.add('active');

        saveBtn.onclick = () => {
            const bIdx = catalog.findIndex(b => b.id === batchId);
            const title = document.getElementById('res-title').value;
            if (!title) return alert("Title is required!");

            const newRes = { title: title };
            if (type === 'video') {
                let val = document.getElementById('res-ytid').value;
                const match = val.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                newRes.youtubeId = (match && match[2].length === 11) ? match[2] : val;
                newRes.thumbnail = document.getElementById('res-thumb').value;
            }
            if (type === 'note') newRes.notes = document.getElementById('res-link').value;
            if (type === 'dpp') newRes.dpp_quiz = [];

            catalog[bIdx].classes.push(newRes);
            saveCatalog();
            editModal.classList.remove('active');
            window.admin.openContentManager(batchId);
        };
    },

    openAttachResourceModal: (batchId, classIdx, type) => {
        const typeNames = { video: "Video Lecture", note: "PDF Note", dpp: "Daily Practice Problem (DPP)" };
        modalTitle.innerText = `Attach ${typeNames[type]}`;

        let fields = '';
        if (type === 'video') {
            fields += `
                <div class="edit-form-group"><label>YouTube Video ID</label><input type="text" id="res-ytid"></div>
                <div class="edit-form-group">
                    <label>Custom Thumbnail (Optional)</label>
                    <input type="text" id="res-thumb" placeholder="Image URL">
                    <input type="file" onchange="window.admin.handleFileUpload(this, 'res-thumb')" accept="image/*" style="margin-top:5px; font-size:12px;">
                </div>`;
        } else if (type === 'note') {
            fields += `
                <div class="edit-form-group">
                    <label>PDF Link (Drive/Cloud)</label>
                    <input type="text" id="res-link">
                    <input type="file" onchange="window.admin.handleFileUpload(this, 'res-link')" accept=".pdf" style="margin-top:5px; font-size:12px;">
                </div>`;
        } else if (type === 'dpp') {
            fields += `<p style="font-size:12px; color:#888;">Quiz module will be enabled for this item. You can edit questions afterwards.</p>`;
        }

        modalFormContainer.innerHTML = fields;
        editModal.classList.add('active');

        saveBtn.onclick = () => {
            const bIdx = catalog.findIndex(b => b.id === batchId);
            const item = catalog[bIdx].classes[classIdx];

            if (type === 'video') {
                let val = document.getElementById('res-ytid').value;
                const match = val.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                item.youtubeId = (match && match[2].length === 11) ? match[2] : val;
                const thumb = document.getElementById('res-thumb').value;
                if (thumb) item.thumbnail = thumb;
            }
            if (type === 'note') item.notes = document.getElementById('res-link').value;
            if (type === 'dpp') item.dpp_quiz = [];

            saveCatalog();
            editModal.classList.remove('active');
            window.admin.openContentManager(batchId);
        };
    },

    openEditResourceModal: (batchId, classIdx) => {
        const bIdx = catalog.findIndex(b => b.id === batchId);
        const item = catalog[bIdx].classes[classIdx];

        modalTitle.innerText = `Edit: ${item.title}`;

        let fields = `
            <div class="edit-form-group"><label>Title</label><input type="text" id="edit-title" value="${item.title}"></div>
        `;

        // If it's a video item
        if (item.youtubeId) {
            fields += `
                <div class="edit-form-group"><label>YouTube Video ID</label><input type="text" id="edit-ytid" value="${item.youtubeId}"></div>
                <div class="edit-form-group">
                    <label>Thumbnail URL</label>
                    <input type="text" id="edit-thumb" value="${item.thumbnail || ''}">
                    <input type="file" onchange="window.admin.handleFileUpload(this, 'edit-thumb')" accept="image/*" style="margin-top:5px; font-size:12px;">
                </div>
            `;
        }

        // If it's a note item
        if (item.notes) {
            fields += `
                <div class="edit-form-group">
                    <label>PDF Notes Link</label>
                    <input type="text" id="edit-notes" value="${item.notes}">
                    <input type="file" onchange="window.admin.handleFileUpload(this, 'edit-notes')" accept=".pdf" style="margin-top:5px; font-size:12px;">
                </div>`;
        }

        modalFormContainer.innerHTML = fields;
        editModal.classList.add('active');

        saveBtn.onclick = () => {
            item.title = document.getElementById('edit-title').value;

            if (document.getElementById('edit-ytid')) {
                let val = document.getElementById('edit-ytid').value;
                const match = val.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                item.youtubeId = (match && match[2].length === 11) ? match[2] : val;
                item.thumbnail = document.getElementById('edit-thumb').value;
            }

            if (document.getElementById('edit-notes')) {
                item.notes = document.getElementById('edit-notes').value;
            }

            saveCatalog();
            editModal.classList.remove('active');
            window.admin.openContentManager(batchId);
        };
    },

    deleteClass: (batchId, idx) => {
        if (confirm("Delete this content?")) {
            const b = catalog.find(i => i.id === batchId);
            b.classes.splice(idx, 1);
            saveCatalog();
            window.admin.openContentManager(batchId);
        }
    },

    editQuiz: (batchId, clsIdx) => {
        const batch = catalog.find(b => b.id === batchId);
        const cls = batch.classes[clsIdx];
        if (!cls.dpp_quiz) cls.dpp_quiz = [];

        modalTitle.innerText = `Quiz Builder: ${cls.title}`;
        renderQuizForm(cls.dpp_quiz);
        editModal.classList.add('active');

        saveBtn.onclick = () => {
            cls.dpp_quiz = Array.from(document.querySelectorAll('.quiz-q-block')).map(block => ({
                q: block.querySelector('.q-text').value,
                options: [
                    block.querySelector('.opt-0').value,
                    block.querySelector('.opt-1').value,
                    block.querySelector('.opt-2').value,
                    block.querySelector('.opt-3').value
                ],
                correct: parseInt(block.querySelector('.q-correct').value)
            }));
            saveCatalog();
            editModal.classList.remove('active');
            alert("Quiz updated successfully!");
        };
    },

    addQuestionToQuiz: () => {
        const container = document.getElementById('quiz-questions-container');
        const qBlock = document.createElement('div');
        qBlock.className = 'quiz-q-block admin-card';
        qBlock.style.background = '#111';
        qBlock.innerHTML = `
            <div class="edit-form-group"><label>Question</label><input type="text" class="q-text"></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <input type="text" class="opt-0" placeholder="Option 1">
                <input type="text" class="opt-1" placeholder="Option 2">
                <input type="text" class="opt-2" placeholder="Option 3">
                <input type="text" class="opt-3" placeholder="Option 4">
            </div>
            <div class="edit-form-group"><label>Correct Option (0-3)</label><input type="number" class="q-correct" min="0" max="3"></div>
            <button class="btn btn-sm red" onclick="this.parentElement.remove()">Remove Question</button>
        `;
        container.appendChild(qBlock);
    }
};

function renderQuizForm(questions) {
    modalFormContainer.innerHTML = `
        <div id="quiz-questions-container">
            ${questions.map((q, idx) => `
                <div class="quiz-q-block admin-card" style="background:#111; margin-bottom:15px;">
                    <div class="edit-form-group"><label>Question ${idx + 1}</label><input type="text" class="q-text" value="${q.q}"></div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <input type="text" class="opt-0" placeholder="Option 1" value="${q.options[0]}">
                        <input type="text" class="opt-1" placeholder="Option 2" value="${q.options[1]}">
                        <input type="text" class="opt-2" placeholder="Option 3" value="${q.options[2]}">
                        <input type="text" class="opt-3" placeholder="Option 4" value="${q.options[3]}">
                    </div>
                    <div class="edit-form-group"><label>Correct Option (0-3)</label><input type="number" class="q-correct" value="${q.correct}" min="0" max="3"></div>
                    <button class="btn btn-sm red" onclick="this.parentElement.remove()">Remove</button>
                </div>
            `).join('')}
        </div>
        <button class="btn btn-sm btn-outline full-width" onclick="window.admin.addQuestionToQuiz()">+ Add Another Question</button>
    `;
}

function handleSave() {
    const data = {
        title: document.getElementById('edit-title').value,
        category: document.getElementById('edit-category').value,
        price: document.getElementById('edit-price').value,
        description: document.getElementById('edit-desc').value,
        image: document.getElementById('edit-image').value
    };
    if (currentEditingId === 'new') {
        catalog.push({ id: 'batch_' + Date.now(), ...data, classes: [], icon: "📚", target: data.category + " Aspirants" });
    } else {
        const idx = catalog.findIndex(b => b.id === currentEditingId);
        catalog[idx] = { ...catalog[idx], ...data };
    }
    saveCatalog();
    editModal.classList.remove('active');
    renderManageBatches();
}

function renderManageUsers() {
    const users = JSON.parse(localStorage.getItem('nitikavya_users') || '{}');
    const userList = Object.values(users);
    adminContent.innerHTML = `
        <div class="admin-card">
            <h3>Registered Students & Subscriptions</h3>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Enrolled Batches</th>
                        <th>XP / Streak</th>
                    </tr>
                </thead>
                <tbody>
                    ${userList.map(u => `
                        <tr>
                            <td><strong>${u.name}</strong></td>
                            <td>${u.email}</td>
                            <td>
                                ${u.enrolledBatches.map(b => `<span style="background:rgba(0,212,255,0.1); color:var(--admin-primary); padding:2px 8px; border-radius:4px; font-size:11px; margin-right:5px;">${b.title}</span>`).join('') || '<span style="color:#444;">No Batches</span>'}
                            </td>
                            <td>⭐ ${u.stats.xp || 0} / 🔥 ${u.stats.streak || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderAnnouncementsManager() {
    const announcements = JSON.parse(localStorage.getItem('nitikavya_announcements')) || [];
    adminContent.innerHTML = `
        <div class="admin-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Manage Announcements</h3>
                <button class="btn btn-sm btn-primary btn-admin" onclick="window.admin.openAddAnnouncement()">+ Create Announcement</button>
            </div>
            <div class="announcement-list">
                ${announcements.map((ann, idx) => `
                    <div class="admin-card" style="background:#080808; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="color:var(--admin-primary);">${ann.pinned ? '📌 ' : ''}${ann.title}</h4>
                            <p style="font-size:12px; color:#888; margin-top:5px;">${ann.description}</p>
                        </div>
                        <button class="btn btn-sm btn-outline red" onclick="window.admin.deleteAnnouncement(${idx})">×</button>
                    </div>
                `).join('') || '<p style="color:#444;">No announcements live yet.</p>'}
            </div>
        </div>
    `;
}

// Extend window.admin for new handlers
Object.assign(window.admin, {
    openAddAnnouncement: () => {
        modalTitle.innerText = "New Global Announcement";
        modalFormContainer.innerHTML = `
            <div class="edit-form-group"><label>Announcement Title</label><input type="text" id="ann-title" placeholder="e.g. New Batch Launch!"></div>
            <div class="edit-form-group"><label>Message Content</label><textarea id="ann-desc" rows="4" placeholder="Important message for all students..."></textarea></div>
            <div class="edit-form-group"><label>Action Link (Optional)</label><input type="text" id="ann-link" placeholder="https://youtube.com/..."></div>
            <div class="edit-form-group" style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" id="ann-pinned">
                <label for="ann-pinned" style="margin:0;">Pin to Top (Important Alert)</label>
            </div>
        `;
        editModal.classList.add('active');
        saveBtn.onclick = () => {
            const announcements = JSON.parse(localStorage.getItem('nitikavya_announcements')) || [];
            const newAnn = {
                title: document.getElementById('ann-title').value,
                description: document.getElementById('ann-desc').value,
                link: document.getElementById('ann-link').value,
                pinned: document.getElementById('ann-pinned').checked,
                date: new Date().toLocaleDateString()
            };
            if (newAnn.pinned) {
                announcements.unshift(newAnn); // Pinned goes to top
            } else {
                announcements.push(newAnn);
            }
            localStorage.setItem('nitikavya_announcements', JSON.stringify(announcements));
            editModal.classList.remove('active');
            renderAnnouncementsManager();
        };
    },
    deleteAnnouncement: (idx) => {
        if (confirm("Remove this announcement?")) {
            const announcements = JSON.parse(localStorage.getItem('nitikavya_announcements')) || [];
            announcements.splice(idx, 1);
            localStorage.setItem('nitikavya_announcements', JSON.stringify(announcements));
            renderAnnouncementsManager();
        }
    }
});

function renderSiteConfig() { adminContent.innerHTML = `<div class="admin-card"><h3>Site Config</h3><p>Website banner/announcement editor coming soon...</p></div>`; }
