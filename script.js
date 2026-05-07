// Quiz Score Tracking
let correctAnswers = 0;
let totalAnswered = 0;

function check(btn, isCorrect) {
    // Prevent answering same question twice - look at sibling buttons only
    let sibling = btn.previousElementSibling;
    let siblingButtons = [btn];

    // Collect all option buttons that belong to this question
    while (sibling && !sibling.classList.contains('question')) {
        if (sibling.classList.contains('option')) {
            siblingButtons.push(sibling);
        }
        sibling = sibling.previousElementSibling;
    }
    sibling = btn.nextElementSibling;
    while (sibling && !sibling.classList.contains('question')) {
        if (sibling.classList.contains('option')) {
            siblingButtons.push(sibling);
        }
        sibling = sibling.nextElementSibling;
    }

    // Check if any sibling is already answered
    let alreadyAnswered = false;
    siblingButtons.forEach(b => {
        if (b.classList.contains('correct') || b.classList.contains('wrong')) {
            alreadyAnswered = true;
        }
    });

    if (alreadyAnswered) return;

    if (isCorrect) {
        btn.classList.add('correct');
        btn.innerHTML += " ✅";
        correctAnswers++;
        updateStudyStats('correct');
    } else {
        btn.classList.add('wrong');
        btn.innerHTML += " ❌";
    }
    totalAnswered++;
    updateStudyStats('answer');
    updateQuizScore();
}

function updateQuizScore() {
    document.getElementById('correctCount').textContent = correctAnswers;
    document.getElementById('totalAnswered').textContent = totalAnswered;
    const percentage = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    document.getElementById('scorePercentage').textContent = percentage + '% Correct';
    document.getElementById('quizScoreTracker').style.display = 'block';
}

function resetQuizScore() {
    correctAnswers = 0;
    totalAnswered = 0;
    document.getElementById('correctCount').textContent = '0';
    document.getElementById('totalAnswered').textContent = '0';
    document.getElementById('scorePercentage').textContent = '--';
    // Reset all quiz buttons
    document.querySelectorAll('.option').forEach(btn => {
        btn.classList.remove('correct', 'wrong');
        btn.innerHTML = btn.innerHTML.replace(' ✅', '').replace(' ❌', '');
    });
}

// Back to Top Button
window.addEventListener('scroll', function () {
    const backToTopBtn = document.getElementById('backToTop');
    if (window.scrollY > 500) {
        backToTopBtn.style.display = 'block';
    } else {
        backToTopBtn.style.display = 'none';
    }
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function calcCommission() {
    const price = parseFloat(document.getElementById('calcPrice').value);
    const rate = parseFloat(document.getElementById('calcRate').value);
    if (price && rate) {
        const commission = price * (rate / 100);
        document.getElementById('commResult').innerHTML =
            `Commission: <span style="font-size: 1.3em;">$${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
    } else {
        document.getElementById('commResult').innerHTML = 'Please enter both values';
    }
}

function calcValue() {
    const noi = parseFloat(document.getElementById('calcNOI').value);
    const capRate = parseFloat(document.getElementById('calcCapRate').value);
    if (noi && capRate) {
        const value = noi / (capRate / 100);
        document.getElementById('valueResult').innerHTML =
            `Property Value: <span style="font-size: 1.3em;">$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
    } else {
        document.getElementById('valueResult').innerHTML = 'Please enter both values';
    }
}

// Navigation active state handler
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-item');

    // Click handler - update active state when clicking
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Scroll spy - update active state based on scroll position
    const sections = document.querySelectorAll('section[id]');

    document.querySelector('.main-content').addEventListener('scroll', function () {
        let current = '';
        const scrollPos = this.scrollTop + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        if (current) {
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href') === '#' + current) {
                    item.classList.add('active');
                }
            });
            // Update breadcrumb
            updateBreadcrumb(current);
        }
    });

    // Initialize enhancements
    initializeDarkMode();
    initializeFontSize();
    initializeProgress();
    initializeCollapsibleSections();
});

// ===== DARK MODE =====
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    document.getElementById('darkModeBtn').textContent = isDark ? '🌙' : '☀️';
}

function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('darkModeBtn').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// ===== FONT SIZE =====
let currentFontSize = 1; // 0=small, 1=normal, 2=large, 3=xlarge
const fontSizes = ['font-small', 'font-normal', 'font-large', 'font-xlarge'];

function changeFontSize(direction) {
    const mainContent = document.querySelector('.main-content');
    mainContent.classList.remove(...fontSizes);
    currentFontSize = Math.max(0, Math.min(3, currentFontSize + direction));
    mainContent.classList.add(fontSizes[currentFontSize]);
    localStorage.setItem('fontSize', currentFontSize);
}

function initializeFontSize() {
    const saved = localStorage.getItem('fontSize');
    if (saved !== null) {
        currentFontSize = parseInt(saved);
        const mainContent = document.querySelector('.main-content');
        mainContent.classList.add(fontSizes[currentFontSize]);
    }
}

// ===== SEARCH =====
let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = event.target.value.toLowerCase().trim();
        if (query.length >= 2) {
            performSearch(query);
        } else {
            clearSearch();
        }
    }, 300);
}

function performSearch(query) {
    clearSearch();
    const mainContent = document.querySelector('.main-content');
    const walker = document.createTreeWalker(mainContent, NodeFilter.SHOW_TEXT, null, false);
    const queryLower = query.toLowerCase();

    // Snapshot matching text nodes first, then mutate — avoids walker descending into
    // newly-inserted highlight spans and re-matching the same text.
    const targets = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent) continue;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') continue;
        if (parent.classList && (parent.classList.contains('search-highlight') || parent.classList.contains('search-result-container'))) continue;
        if (node.textContent.toLowerCase().includes(queryLower)) {
            targets.push(node);
        }
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    let firstMatch = null;

    targets.forEach(node => {
        const parent = node.parentElement;
        if (!parent) return;
        const span = document.createElement('span');
        span.classList.add('search-result-container');
        span.innerHTML = node.textContent.replace(regex, '<span class="search-highlight">$1</span>');
        parent.replaceChild(span, node);
        if (!firstMatch) firstMatch = span.querySelector('.search-highlight');
    });

    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function clearSearch() {
    document.querySelectorAll('.search-result-container').forEach(container => {
        const text = container.textContent;
        const textNode = document.createTextNode(text);
        container.parentElement.replaceChild(textNode, container);
    });
    document.querySelectorAll('.search-highlight').forEach(el => {
        const text = el.textContent;
        const textNode = document.createTextNode(text);
        el.parentElement.replaceChild(textNode, el);
    });
    document.getElementById('searchInput').value = '';
}

// ===== PROGRESS TRACKING =====
// Derive section IDs from the DOM so the progress total matches what's actually
// on the page (the previous hardcoded list missed 8 sections, letting the bar
// exceed 100% if a user checked any of them off).
function getSectionIds() {
    return Array.from(document.querySelectorAll('section[id]')).map(s => s.id);
}

// ===== MOBILE SIDEBAR =====
function toggleMobileSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

// Close sidebar when clicking a link on mobile
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleMobileSidebar();
        }
    });
});

function initializeProgress() {
    const progress = JSON.parse(localStorage.getItem('studyProgress') || '{}');

    // Add progress checkboxes to section headers
    document.querySelectorAll('h2[id], section[id] > h2').forEach(h2 => {
        const section = h2.closest('section');
        const sectionId = section ? section.id : h2.id;
        if (!sectionId) return;

        const progressCheck = document.createElement('span');
        progressCheck.className = 'section-progress';
        progressCheck.innerHTML = `
                    <span class="progress-check ${progress[sectionId] ? 'completed' : ''}" 
                          onclick="event.stopPropagation(); toggleSectionProgress('${sectionId}', this)">
                        ${progress[sectionId] ? '✓' : ''}
                    </span>
                `;
        h2.appendChild(progressCheck);
    });

    updateOverallProgress();
}

function toggleSectionProgress(sectionId, element) {
    const progress = JSON.parse(localStorage.getItem('studyProgress') || '{}');
    progress[sectionId] = !progress[sectionId];
    localStorage.setItem('studyProgress', JSON.stringify(progress));

    element.classList.toggle('completed');
    element.textContent = progress[sectionId] ? '✓' : '';
    updateOverallProgress();
}

function updateOverallProgress() {
    const progress = JSON.parse(localStorage.getItem('studyProgress') || '{}');
    const ids = getSectionIds();
    // Only count progress for sections that still exist on the page.
    const completed = ids.filter(id => progress[id]).length;
    const total = Math.max(ids.length, 1);
    const percent = Math.round((completed / total) * 100);

    document.getElementById('overallProgress').style.width = percent + '%';
    document.getElementById('progressText').textContent = `${percent}% Complete (${completed}/${total})`;
}

// ===== COLLAPSIBLE SECTIONS =====
let allCollapsed = false;

function initializeCollapsibleSections() {
    document.querySelectorAll('section[id]').forEach(section => {
        const h2 = section.querySelector('h2');
        if (!h2) return;

        h2.classList.add('section-header');

        // Wrap content after h2 in a div
        const content = document.createElement('div');
        content.className = 'section-content';

        while (h2.nextSibling) {
            content.appendChild(h2.nextSibling);
        }
        section.appendChild(content);

        h2.addEventListener('click', () => {
            h2.classList.toggle('collapsed');
            content.classList.toggle('hidden');
        });
    });
}

function toggleAllSections() {
    allCollapsed = !allCollapsed;
    document.querySelectorAll('.section-header').forEach(header => {
        const content = header.parentElement.querySelector('.section-content');
        if (allCollapsed) {
            header.classList.add('collapsed');
            content.classList.add('hidden');
        } else {
            header.classList.remove('collapsed');
            content.classList.remove('hidden');
        }
    });
    document.getElementById('collapseBtn').textContent = allCollapsed ? '📁' : '📂';
}

// ===== BREADCRUMB =====
function updateBreadcrumb(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const h2 = section.querySelector('h2');
    if (!h2) return;

    let breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) {
        breadcrumb = document.createElement('div');
        breadcrumb.id = 'breadcrumb';
        breadcrumb.className = 'breadcrumb';
        const header = document.querySelector('.main-content header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(breadcrumb, header.nextSibling);
        }
    }

    let sectionText = '';
    h2.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) sectionText += n.textContent;
    });
    sectionText = sectionText.trim();
    if (!sectionText) sectionText = h2.textContent.replace(/[★☆✓]/g, '').trim();
    breadcrumb.innerHTML = `📍 Currently viewing: <strong>${sectionText}</strong>`;
}

// ===== TEXT-TO-SPEECH (Audio) =====
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

// Add double-click to speak on key terms
document.addEventListener('dblclick', function (e) {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0 && selection.length < 100) {
        speakText(selection);
    }
});

// ===== SHUFFLE QUESTIONS =====
function shuffleQuestions() {
    const container = document.getElementById('quizContainer');
    const questions = [];
    let currentQuestion = null;

    // Group questions with their options
    container.childNodes.forEach(node => {
        if (node.classList && node.classList.contains('question')) {
            if (currentQuestion) questions.push(currentQuestion);
            currentQuestion = [node];
        } else if (currentQuestion && node.nodeType === 1) {
            currentQuestion.push(node);
        }
    });
    if (currentQuestion) questions.push(currentQuestion);

    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Rebuild container
    container.innerHTML = '';
    questions.forEach((group, idx) => {
        group.forEach((node, nodeIdx) => {
            if (nodeIdx === 0) {
                // Renumber by editing only the leading text node so we don't
                // re-parse the question's HTML (which would strip the flag
                // button's JS-attached onclick handler).
                const first = node.childNodes[0];
                if (first && first.nodeType === Node.TEXT_NODE) {
                    first.textContent = first.textContent.replace(/^\s*\d+\./, `${idx + 1}.`);
                }
            }
            container.appendChild(node);
        });
    });

    // Track shuffle in stats
    updateStudyStats('shuffle');
    alert('Questions shuffled! 🔀');
}

// ===== TIMER MODE =====
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

function toggleTimer() {
    const btn = document.getElementById('timerBtn');
    const display = document.getElementById('timerDisplay');

    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        btn.textContent = '⏱️ Resume Timer';
        btn.style.background = '#22c55e';
    } else {
        timerRunning = true;
        display.style.display = 'block';
        btn.textContent = '⏸️ Pause Timer';
        btn.style.background = '#ef4444';

        timerInterval = setInterval(() => {
            timerSeconds++;
            const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
            const secs = (timerSeconds % 60).toString().padStart(2, '0');
            display.textContent = `${mins}:${secs}`;

            // Save study time
            localStorage.setItem('studyTime', (parseInt(localStorage.getItem('studyTime') || '0') + 1).toString());
        }, 1000);
    }
}

// ===== WEAK AREAS TRACKING =====
// Keyed by question text (stable across shuffles) instead of DOM index.
let weakAreas = JSON.parse(localStorage.getItem('weakAreas') || '[]');
// Migrate older numeric-index data — drop entries that aren't strings.
weakAreas = weakAreas.filter(k => typeof k === 'string');

function questionKey(q) {
    return (q.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function optionKey(btn) {
    return (btn.textContent || '').replace(/\s*[✅❌]\s*$/, '').replace(/\s+/g, ' ').trim();
}

function siblingOptionsOf(qEl) {
    const opts = [];
    let sib = qEl.nextElementSibling;
    while (sib && !sib.classList.contains('question')) {
        if (sib.classList.contains('option')) opts.push(sib);
        sib = sib.nextElementSibling;
    }
    return opts;
}

function addFlagButtons() {
    document.querySelectorAll('.question').forEach(q => {
        if (!q.querySelector('.flag-btn')) {
            const key = questionKey(q);
            const flagBtn = document.createElement('button');
            flagBtn.className = 'flag-btn';
            flagBtn.innerHTML = weakAreas.includes(key) ? '🚩' : '⚪';
            flagBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 1.2rem; margin-left: 10px;';
            flagBtn.onclick = (e) => {
                e.stopPropagation();
                toggleWeakArea(key, flagBtn);
            };
            q.appendChild(flagBtn);
        }
    });
    updateWeakCount();
}

function toggleWeakArea(key, btn) {
    if (weakAreas.includes(key)) {
        weakAreas = weakAreas.filter(k => k !== key);
        btn.innerHTML = '⚪';
    } else {
        weakAreas.push(key);
        btn.innerHTML = '🚩';
    }
    localStorage.setItem('weakAreas', JSON.stringify(weakAreas));
    updateWeakCount();
}

function updateWeakCount() {
    document.getElementById('weakCount').textContent = weakAreas.length;
}

function showWeakAreas() {
    if (weakAreas.length === 0) {
        alert('No weak areas flagged yet! Click the ⚪ next to questions to flag them for review.');
        return;
    }

    let firstFlagged = null;
    document.querySelectorAll('.question').forEach(q => {
        if (weakAreas.includes(questionKey(q))) {
            q.style.border = '3px solid #ef4444';
            q.style.borderRadius = '8px';
            q.style.padding = '10px';
            if (!firstFlagged) firstFlagged = q;
        } else {
            q.style.border = '';
            q.style.padding = '';
        }
    });
    if (firstFlagged) firstFlagged.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alert(`Showing ${weakAreas.length} flagged weak area(s). Scroll to see highlighted questions.`);
}

// ===== SECTION BOOKMARKS =====
let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');

function addBookmarkButtons() {
    document.querySelectorAll('section[id] > h2').forEach(h2 => {
        const sectionId = h2.parentElement.id;
        if (!h2.querySelector('.bookmark-btn')) {
            const btn = document.createElement('button');
            btn.className = 'bookmark-btn';
            btn.innerHTML = bookmarks.includes(sectionId) ? '⭐' : '☆';
            btn.title = 'Bookmark this section';
            btn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 1.2rem; margin-left: 10px;';
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleBookmark(sectionId, btn);
            };
            h2.insertBefore(btn, h2.firstChild);
        }
    });
}

function toggleBookmark(sectionId, btn) {
    if (bookmarks.includes(sectionId)) {
        bookmarks = bookmarks.filter(id => id !== sectionId);
        btn.innerHTML = '☆';
    } else {
        bookmarks.push(sectionId);
        btn.innerHTML = '⭐';
    }
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function (e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case '?':
            showKeyboardShortcuts();
            break;
        case 'd':
        case 'D':
            toggleDarkMode();
            break;
        case 't':
        case 'T':
            scrollToTop();
            break;
        case 's':
        case 'S':
            document.getElementById('searchInput').focus();
            e.preventDefault();
            break;
        case 'r':
        case 'R': {
            const quiz = document.getElementById('quizContainer');
            if (quiz) shuffleQuestions();
            break;
        }
        case 'Escape':
            clearSearch();
            break;
    }
});

function showKeyboardShortcuts() {
    alert(`⌨️ KEYBOARD SHORTCUTS

? - Show this help
D - Toggle Dark Mode
T - Scroll to Top
S - Focus Search
R - Shuffle Questions
Esc - Clear Search

Double-click any text to hear it spoken!`);
}

// ===== STUDY STATISTICS =====
// Each action increments its own counter — never overwrites with a session
// value (that wiped saved totals back to 0 on every page load).
function updateStudyStats(action) {
    const stats = JSON.parse(localStorage.getItem('studyStats') || '{}');
    stats.lastVisit = new Date().toISOString();
    if (action === 'visit')   stats.totalVisits       = (stats.totalVisits       || 0) + 1;
    if (action === 'shuffle') stats.shuffleCount      = (stats.shuffleCount      || 0) + 1;
    if (action === 'answer')  stats.questionsAnswered = (stats.questionsAnswered || 0) + 1;
    if (action === 'correct') stats.correctAnswers    = (stats.correctAnswers    || 0) + 1;
    localStorage.setItem('studyStats', JSON.stringify(stats));
}

function showStudyStats() {
    const stats = JSON.parse(localStorage.getItem('studyStats') || '{}');
    const studyTime = parseInt(localStorage.getItem('studyTime') || '0');
    const mins = Math.floor(studyTime / 60);

    alert(`📊 STUDY STATISTICS

Total Visits: ${stats.totalVisits || 0}
Study Time: ${mins} minutes
Questions Answered: ${stats.questionsAnswered || 0}
Correct Answers: ${stats.correctAnswers || 0}
Accuracy: ${stats.questionsAnswered ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0}%
Last Visit: ${stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : 'N/A'}`);
}

// Initialize new features
document.addEventListener('DOMContentLoaded', function () {
    addFlagButtons();
    addBookmarkButtons();
    updateStudyStats('visit');
    checkForSavedProgress();
});

// ===== SAVE & LOAD QUIZ PROGRESS =====
function saveQuizProgress() {
    // Save answers keyed by (question text, option text) so the data survives shuffles.
    const answers = [];
    document.querySelectorAll('.question').forEach(q => {
        const qKey = questionKey(q);
        siblingOptionsOf(q).forEach(btn => {
            if (btn.classList.contains('correct')) {
                answers.push({ qKey, optKey: optionKey(btn), state: 'correct' });
            } else if (btn.classList.contains('wrong')) {
                answers.push({ qKey, optKey: optionKey(btn), state: 'wrong' });
            }
        });
    });

    const progress = {
        version: 2,
        answers,
        correctAnswers,
        totalAnswered,
        timerSeconds,
        weakAreas,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('quizProgress', JSON.stringify(progress));

    // Show saved indicator
    const indicator = document.getElementById('savedProgressIndicator');
    indicator.style.display = 'block';
    setTimeout(() => { indicator.style.display = 'none'; }, 3000);

    alert(`✅ Progress Saved!\n\nAnswered: ${totalAnswered} questions\nCorrect: ${correctAnswers}\nTimer: ${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}\n\nYou can close this page and resume later.`);
}

function loadQuizProgress() {
    const saved = localStorage.getItem('quizProgress');
    if (!saved) {
        alert('No saved progress found. Start answering questions and click "Save Progress" to save.');
        return;
    }

    const progress = JSON.parse(saved);
    const savedDate = new Date(progress.savedAt).toLocaleString();

    if (!confirm(`📂 Found saved progress from ${savedDate}\n\nAnswered: ${progress.totalAnswered} questions\nCorrect: ${progress.correctAnswers}\nTimer: ${Math.floor(progress.timerSeconds / 60)}:${(progress.timerSeconds % 60).toString().padStart(2, '0')}\n\nLoad this progress?`)) {
        return;
    }

    // Restore answers — match by question + option text so it works after shuffling.
    if (progress.version >= 2 && Array.isArray(progress.answers)) {
        const lookup = new Map();
        document.querySelectorAll('.question').forEach(q => {
            const qKey = questionKey(q);
            siblingOptionsOf(q).forEach(btn => {
                lookup.set(qKey + '' + optionKey(btn), btn);
            });
        });
        progress.answers.forEach(a => {
            const btn = lookup.get(a.qKey + '' + a.optKey);
            if (btn) {
                btn.classList.add(a.state);
                btn.innerHTML += a.state === 'correct' ? ' ✅' : ' ❌';
            }
        });
    } else if (Array.isArray(progress.answeredQuestions)) {
        // Legacy v1 fallback — index-based, only correct if questions haven't been shuffled.
        const allOptions = document.querySelectorAll('.option');
        progress.answeredQuestions.forEach(a => {
            const btn = allOptions[a.idx];
            if (btn) {
                btn.classList.add(a.state);
                btn.innerHTML += a.state === 'correct' ? ' ✅' : ' ❌';
            }
        });
    }

    // Restore scores
    correctAnswers = progress.correctAnswers;
    totalAnswered = progress.totalAnswered;
    timerSeconds = progress.timerSeconds;
    weakAreas = (progress.weakAreas || []).filter(k => typeof k === 'string');

    // Update UI
    updateQuizScore();
    updateWeakCount();

    // Update timer display
    const timerDisplay = document.getElementById('timerDisplay');
    const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const secs = (timerSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
    timerDisplay.style.display = 'block';

    alert('✅ Progress loaded! Continue where you left off.');
}

function checkForSavedProgress() {
    const saved = localStorage.getItem('quizProgress');
    if (saved) {
        const progress = JSON.parse(saved);
        const savedDate = new Date(progress.savedAt).toLocaleString();
        // Show subtle indicator that saved progress exists
        console.log(`Saved quiz progress found from ${savedDate}. Click "Load Progress" to resume.`);
    }
}

function clearSavedProgress() {
    localStorage.removeItem('quizProgress');
    alert('Saved progress cleared.');
}
