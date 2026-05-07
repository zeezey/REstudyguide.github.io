
// ==================== SETTINGS & STATE ====================
let settings = {
    quizLength: 180,
    selectedCategories: new Set(),
    weightedRandom: false,
    shuffleAnswers: true,
    theme: 'light'
};

// Map the 60+ raw category strings in the question bank to a smaller, canonical set
// so the filter UI is usable. Anything not listed falls through to its base name.
const CATEGORY_NORMALIZATION = {
    'Agency Relationships': 'Agency',
    'Property Interests': 'Property',
    'Property Rights': 'Property',
    'Acquisitions': 'Property',
    'Encumbrances': 'Property',
    'Property Insurance': 'Property',
    'Rights': 'Property',
    'Finance': 'Financing',
    'Financing Concepts': 'Financing',
    'Financing Documents': 'Financing',
    'Foreclosure': 'Financing',
    'Disclosures': 'Disclosure',
    'Government Powers': 'Government',
    'Government Rights': 'Government',
    'Environment': 'Environmental',
    'Environmental Law': 'Environmental',
    'Lease': 'Leases',
    'Landlord Tenant Act': 'Leases',
    'ARLTA': 'Leases',
    'Tax': 'Taxes',
    'Income Tax': 'Taxes',
    'Land Descriptions': 'Legal Descriptions',
    'Water Law': 'Water Rights',
    'Zoning vs CC&Rs': 'Zoning',
    'Land Use': 'Zoning',
    'Land Development': 'Zoning',
    'Subdivision': 'Zoning',
    'Real Estate Statutes': 'Real Estate Law',
    'Federal Laws': 'Real Estate Law',
    'Laws': 'Real Estate Law',
    'Regulations': 'Real Estate Law',
    'Arizona Law': 'Arizona',
    "Commissioner's Rules": 'Arizona',
    'Cooperative Nature': 'Brokerage',
    'Brokerage Management': 'Brokerage',
    'Antitrust': 'Brokerage',
    'Trust Accounts': 'Brokerage',
    'Escrow': 'Brokerage',
    'Transfer of Title': 'Transfer',
    'Title': 'Transfer',
    'Deeds': 'Transfer'
};

function normalizeCategory(rawCat) {
    const base = (rawCat || '').split(' / ')[0].trim();
    return CATEGORY_NORMALIZATION[base] || base;
}

// Minimal HTML-entity escaper for safely interpolating arbitrary strings
// into innerHTML (category labels, question/option text from the bank).
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Get all unique categories from question bank
function getCategories() {
    const cats = new Set();
    questionBank.forEach(q => cats.add(normalizeCategory(q.cat)));
    return Array.from(cats).sort();
}

// Exam state
let examState = {
    questions: [],
    currentIndex: 0,
    answers: {},
    flagged: new Set(),
    timeRemaining: 5 * 60 * 60,
    isReviewMode: false,
    studyMode: false,
    submitted: false,
    originalAnswerOrder: {} // Track shuffled answer mapping
};

let timerInterval = null;

// Missed questions storage
function getMissedQuestions() {
    const missed = localStorage.getItem('azMissedQuestions');
    return missed ? JSON.parse(missed) : [];
}

function saveMissedQuestion(questionId) {
    const missed = getMissedQuestions();
    if (!missed.includes(questionId)) {
        missed.push(questionId);
        localStorage.setItem('azMissedQuestions', JSON.stringify(missed));
    }
}

function removeMissedQuestion(questionId) {
    let missed = getMissedQuestions();
    missed = missed.filter(id => id !== questionId);
    localStorage.setItem('azMissedQuestions', JSON.stringify(missed));
}

// Bookmarked questions storage
function getBookmarkedQuestions() {
    const bookmarks = localStorage.getItem('azBookmarkedQuestions');
    return bookmarks ? JSON.parse(bookmarks) : [];
}

function saveBookmarkedQuestion(questionId) {
    const bookmarks = getBookmarkedQuestions();
    if (!bookmarks.includes(questionId)) {
        bookmarks.push(questionId);
        localStorage.setItem('azBookmarkedQuestions', JSON.stringify(bookmarks));
    }
}

function removeBookmarkedQuestion(questionId) {
    let bookmarks = getBookmarkedQuestions();
    bookmarks = bookmarks.filter(id => id !== questionId);
    localStorage.setItem('azBookmarkedQuestions', JSON.stringify(bookmarks));
}

// Question performance tracking (for weighted random)
function getQuestionPerformance() {
    const perf = localStorage.getItem('azQuestionPerformance');
    return perf ? JSON.parse(perf) : {};
}

function recordQuestionPerformance(questionId, correct) {
    const perf = getQuestionPerformance();
    if (!perf[questionId]) {
        perf[questionId] = { correct: 0, incorrect: 0 };
    }
    if (correct) {
        perf[questionId].correct++;
    } else {
        perf[questionId].incorrect++;
    }
    localStorage.setItem('azQuestionPerformance', JSON.stringify(perf));
}

// Theme toggle
function setThemeToggleLabel(theme) {
    const label = document.querySelector('.theme-toggle .tt-label');
    if (label) label.textContent = theme === 'dark' ? 'Dawn' : 'Dusk';
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('azTheme', newTheme);
    setThemeToggleLabel(newTheme);
}

// Quiz length selection
function selectQuizLength(length) {
    settings.quizLength = length;
    document.querySelectorAll('.quiz-length-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.textContent) === length);
    });
}

// Category selection
function toggleCategory(cat) {
    if (settings.selectedCategories.has(cat)) {
        settings.selectedCategories.delete(cat);
    } else {
        settings.selectedCategories.add(cat);
    }
    updateCategoryDisplay();
}

function selectAllCategories() {
    getCategories().forEach(cat => settings.selectedCategories.add(cat));
    updateCategoryDisplay();
}

function deselectAllCategories() {
    settings.selectedCategories.clear();
    updateCategoryDisplay();
}

function updateCategoryDisplay() {
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        const checkbox = item.querySelector('input');
        const cat = checkbox.value;
        checkbox.checked = settings.selectedCategories.has(cat);
        item.classList.toggle('selected', settings.selectedCategories.has(cat));
    });

    const allCats = getCategories();
    const selectedCount = settings.selectedCategories.size;
    document.getElementById('categoryCount').textContent =
        selectedCount === allCats.length ? '(All selected)' :
            selectedCount === 0 ? '(None selected)' :
                `(${selectedCount} of ${allCats.length})`;
}

// Populate category grid
function populateCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    const categories = getCategories();

    // Count questions per category (normalized)
    const catCounts = {};
    questionBank.forEach(q => {
        const c = normalizeCategory(q.cat);
        catCounts[c] = (catCounts[c] || 0) + 1;
    });

    grid.innerHTML = categories.map(cat => {
        const safe = escapeHtml(cat);
        const count = catCounts[cat] || 0;
        return `
            <label class="category-item" data-cat="${safe}">
                <input type="checkbox" value="${safe}" checked>
                <span>${safe} <span style="color:var(--text-muted); font-size:0.8em;">(${count})</span></span>
            </label>
        `;
    }).join('');

    // Delegated click handler — replaces the inline onclick interpolation,
    // so category strings can never break out of an attribute.
    grid.onclick = e => {
        const label = e.target.closest('.category-item');
        if (label && label.dataset.cat) toggleCategory(label.dataset.cat);
    };

    // Select all by default
    selectAllCategories();
}

// Update stats dashboard
function updateStatsDashboard() {
    const history = JSON.parse(localStorage.getItem('azExamScoreHistory') || '[]');
    const missed = getMissedQuestions();
    const bookmarks = getBookmarkedQuestions();

    document.getElementById('totalExams').textContent = history.length;

    if (history.length > 0) {
        const avgScore = Math.round(history.reduce((sum, h) => sum + h.percent, 0) / history.length);
        document.getElementById('avgScore').textContent = avgScore + '%';
    } else {
        document.getElementById('avgScore').textContent = '0%';
    }

    document.getElementById('missedCount').textContent = missed.length;
    document.getElementById('bookmarkCount').textContent = bookmarks.length;
    document.getElementById('missedBtnCount').textContent = missed.length;
    document.getElementById('bookmarkedBtnCount').textContent = bookmarks.length;

    // Disable buttons if no questions
    document.getElementById('missedBtn').disabled = missed.length === 0;
    document.getElementById('bookmarkedBtn').disabled = bookmarks.length === 0;
}

// Check for saved progress on page load
window.onload = function () {
    // Restore theme
    const savedTheme = localStorage.getItem('azTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setThemeToggleLabel(savedTheme);

    // Populate categories
    populateCategoryGrid();

    // Update stats
    updateStatsDashboard();

    // Load score history
    loadScoreHistory();

    // Check for saved progress
    const saved = localStorage.getItem('azExamProgress');
    if (saved) {
        document.getElementById('resumePrompt').classList.remove('hidden');
        document.getElementById('startBtn').classList.add('hidden');
    }

    // Setup keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
};



// Get filtered questions based on settings
function getFilteredQuestions() {
    let filtered = questionBank.filter(q => settings.selectedCategories.has(normalizeCategory(q.cat)));

    // Apply weighted random if enabled
    if (document.getElementById('weightedRandom').checked) {
        const perf = getQuestionPerformance();
        filtered = filtered.map(q => ({
            ...q,
            weight: perf[q.id] ? (perf[q.id].incorrect + 1) / (perf[q.id].correct + 1) : 1
        }));
        // Sort by weight (higher weight = more likely to be wrong)
        filtered.sort((a, b) => b.weight - a.weight);
        // Take top portion first, then shuffle
        const priorityCount = Math.min(Math.floor(settings.quizLength * 0.6), filtered.length);
        const priorityQuestions = filtered.slice(0, priorityCount);
        const otherQuestions = shuffleArray(filtered.slice(priorityCount));
        filtered = [...shuffleArray(priorityQuestions), ...otherQuestions];
    } else {
        filtered = shuffleArray([...filtered]);
    }

    return filtered.slice(0, Math.min(settings.quizLength, filtered.length));
}

// Prepare questions with optional answer shuffling
function prepareQuestions(questions) {
    const shuffleOpts = document.getElementById('shuffleAnswers').checked;

    return questions.map((q) => {
        if (shuffleOpts) {
            const optionsWithIndex = q.opts.map((opt, i) => ({ opt, originalIndex: i }));
            const shuffledOptions = shuffleArray([...optionsWithIndex]);
            const order = shuffledOptions.map(o => o.originalIndex);
            const newAnsIndex = order.indexOf(q.ans);

            return {
                ...q,
                opts: shuffledOptions.map(o => o.opt),
                ans: newAnsIndex,
                _originalAns: q.ans,
                _optsOrder: order
            };
        }
        return { ...q, _optsOrder: q.opts.map((_, i) => i) };
    });
}

// Start new exam
function startNewExam() {
    localStorage.removeItem('azExamProgress');

    const filtered = getFilteredQuestions();
    if (filtered.length === 0) {
        alert('Please select at least one category!');
        return;
    }

    const preparedQuestions = prepareQuestions(filtered);
    const timeLimit = Math.max(Math.ceil(preparedQuestions.length * 100), 1800); // ~1.67 min per question, min 30 min

    examState = {
        questions: preparedQuestions,
        currentIndex: 0,
        answers: {},
        flagged: new Set(),
        timeRemaining: timeLimit,
        isReviewMode: false,
        studyMode: false,
        submitted: false
    };
    showExamScreen();
}

// Start study mode - instant feedback after each question
function startStudyMode() {
    localStorage.removeItem('azExamProgress');

    const filtered = getFilteredQuestions();
    if (filtered.length === 0) {
        alert('Please select at least one category!');
        return;
    }

    const preparedQuestions = prepareQuestions(filtered);

    examState = {
        questions: preparedQuestions,
        currentIndex: 0,
        answers: {},
        flagged: new Set(),
        timeRemaining: 5 * 60 * 60, // 5 hours
        isReviewMode: false,
        studyMode: true,
        submitted: false
    };
    showExamScreen();
}

// Start missed questions practice mode
function startMissedMode() {
    localStorage.removeItem('azExamProgress');
    const missedIds = getMissedQuestions();

    if (missedIds.length === 0) {
        alert('No missed questions to practice! Take some exams first.');
        return;
    }

    const missedQuestions = questionBank.filter(q => missedIds.includes(q.id));
    const preparedQuestions = prepareQuestions(shuffleArray([...missedQuestions]));

    examState = {
        questions: preparedQuestions,
        currentIndex: 0,
        answers: {},
        flagged: new Set(),
        timeRemaining: 5 * 60 * 60,
        isReviewMode: false,
        studyMode: true,
        submitted: false
    };
    showExamScreen();
}

// Start bookmarked questions practice mode
function startBookmarkedMode() {
    localStorage.removeItem('azExamProgress');
    const bookmarkIds = getBookmarkedQuestions();

    if (bookmarkIds.length === 0) {
        alert('No bookmarked questions! Bookmark some questions first.');
        return;
    }

    const bookmarkedQuestions = questionBank.filter(q => bookmarkIds.includes(q.id));
    const preparedQuestions = prepareQuestions(shuffleArray([...bookmarkedQuestions]));

    examState = {
        questions: preparedQuestions,
        currentIndex: 0,
        answers: {},
        flagged: new Set(),
        timeRemaining: 5 * 60 * 60,
        isReviewMode: false,
        studyMode: true,
        submitted: false
    };
    showExamScreen();
}


// Resume saved exam — supports both v2 (slim, IDs only) and legacy (full questions) saves.
function resumeExam() {
    const saved = JSON.parse(localStorage.getItem('azExamProgress'));
    if (!saved) return;

    let questions;
    if (saved.questionRefs) {
        // v2 slim: rebuild questions from IDs + option ordering.
        const byId = {};
        questionBank.forEach(q => { byId[q.id] = q; });
        questions = saved.questionRefs.map(ref => {
            const orig = byId[ref.id];
            if (!orig) return null;
            const order = (ref.order && ref.order.length === orig.opts.length) ? ref.order : orig.opts.map((_, i) => i);
            const opts = order.map(i => orig.opts[i]);
            const ans = order.indexOf(orig.ans);
            return { ...orig, opts, ans, _originalAns: orig.ans, _optsOrder: order };
        }).filter(Boolean);
    } else if (Array.isArray(saved.questions)) {
        // Legacy: full question objects were saved.
        questions = saved.questions;
    } else {
        return;
    }

    if (questions.length === 0) {
        localStorage.removeItem('azExamProgress');
        return;
    }

    // Clamp currentIndex in case the underlying question bank changed and some
    // saved questions could not be rehydrated.
    const savedIdx = Number.isInteger(saved.currentIndex) ? saved.currentIndex : 0;
    const currentIndex = Math.max(0, Math.min(savedIdx, questions.length - 1));

    examState = {
        questions,
        currentIndex,
        answers: saved.answers || {},
        flagged: new Set(saved.flagged || []),
        timeRemaining: saved.timeRemaining != null ? saved.timeRemaining : (5 * 60 * 60),
        isReviewMode: saved.isReviewMode || false,
        studyMode: saved.studyMode || false,
        submitted: saved.submitted || false
    };
    showExamScreen();
}

// Show exam
function showExamScreen() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('resultsScreen').classList.add('hidden');
    document.getElementById('examScreen').classList.remove('hidden');
    // Restore controls that review mode hides — otherwise a new exam after
    // a review session has no Mark-for-review or Submit button.
    document.getElementById('flagBtn').style.display = '';
    document.getElementById('submitBtn').style.display = '';
    document.getElementById('timer').classList.remove('review');
    buildNavGrid();
    displayQuestion();
    startTimer();
    saveProgress();
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Build navigator grid
function buildNavGrid() {
    const grid = document.getElementById('navGrid');
    grid.innerHTML = '';
    for (let i = 0; i < examState.questions.length; i++) {
        const item = document.createElement('div');
        item.className = 'nav-item-btn';
        item.textContent = i + 1;
        item.onclick = () => goToQuestion(i);
        grid.appendChild(item);
    }
    updateNavGrid();
}

// Update navigator grid
function updateNavGrid() {
    const items = document.querySelectorAll('.nav-item-btn');
    let answered = 0;
    let correct = 0;
    items.forEach((item, i) => {
        item.className = 'nav-item-btn';
        if (i === examState.currentIndex) item.classList.add('current');
        if (examState.answers[i] !== undefined) {
            answered++;
            // In study mode or review mode, show correct/incorrect colors
            if (examState.studyMode || examState.isReviewMode) {
                const q = examState.questions[i];
                if (examState.answers[i] === q.ans) {
                    item.classList.add('nav-correct');
                    correct++;
                } else {
                    item.classList.add('nav-incorrect');
                }
            } else {
                item.classList.add('answered');
            }
        }
        if (examState.flagged.has(i)) item.classList.add('flagged');
    });
    if (examState.studyMode || examState.isReviewMode) {
        document.getElementById('answeredCount').textContent = `(${correct}/${answered} correct)`;
    } else {
        document.getElementById('answeredCount').textContent = `(${answered}/${examState.questions.length} answered)`;
    }
    document.getElementById('progressBar').style.width = `${(answered / examState.questions.length) * 100}%`;
}

// Display current question
function displayQuestion() {
    const q = examState.questions[examState.currentIndex];
    document.getElementById('questionNumber').textContent = `Question ${examState.currentIndex + 1} of ${examState.questions.length}`;
    document.getElementById('categoryTag').textContent = normalizeCategory(q.cat);
    document.getElementById('questionText').textContent = q.q;

    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    const alreadyAnswered = examState.answers[examState.currentIndex] !== undefined;
    const showFeedback = examState.isReviewMode || (examState.studyMode && alreadyAnswered);

    q.opts.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option';
        if (examState.answers[examState.currentIndex] === i) div.classList.add('selected');
        if (showFeedback) {
            if (i === q.ans) div.classList.add('correct');
            else if (examState.answers[examState.currentIndex] === i) div.classList.add('incorrect');
        }
        // Build children with textContent so option text is never parsed as HTML.
        const letterSpan = document.createElement('span');
        letterSpan.className = 'option-letter';
        letterSpan.textContent = letters[i];
        const textSpan = document.createElement('span');
        textSpan.textContent = opt;
        div.appendChild(letterSpan);
        div.appendChild(textSpan);

        if (!examState.isReviewMode && !(examState.studyMode && alreadyAnswered)) {
            div.onclick = () => selectAnswer(i);
        } else {
            div.classList.add('disabled');
            div.style.cursor = 'default';
        }
        container.appendChild(div);
    });

    // Show explanation in review mode or study mode (for answered questions)
    const expDiv = document.getElementById('explanation');
    if (showFeedback) {
        document.getElementById('explanationText').textContent = q.exp;
        expDiv.classList.add('show');
    } else {
        expDiv.classList.remove('show');
    }


    // Update flag button
    document.getElementById('flagBtn').textContent = examState.flagged.has(examState.currentIndex) ? '🚩 Flagged' : '🚩 Mark for Review';

    // Update prev/next buttons
    document.getElementById('prevBtn').disabled = examState.currentIndex === 0;
    document.getElementById('nextBtn').disabled = examState.currentIndex === examState.questions.length - 1;

    updateNavGrid();
    updateBookmarkButton();
}

// Select answer
function selectAnswer(index) {
    const alreadyAnswered = examState.answers[examState.currentIndex] !== undefined;
    // Study-mode answers are locked once given (the click handler is removed,
    // but the keyboard shortcut would otherwise overwrite the saved choice).
    if (examState.studyMode && alreadyAnswered) return;

    examState.answers[examState.currentIndex] = index;

    if (examState.studyMode && !alreadyAnswered) {
        showStudyFeedback();
    } else {
        displayQuestion();
    }
    saveProgress();
}

// Show instant feedback in study mode
function showStudyFeedback() {
    const q = examState.questions[examState.currentIndex];
    const container = document.getElementById('optionsContainer');
    const options = container.querySelectorAll('.option');
    const userAnswer = examState.answers[examState.currentIndex];

    options.forEach((opt, i) => {
        opt.onclick = null; // Disable further clicks
        opt.style.cursor = 'default';
        if (i === q.ans) {
            opt.classList.add('correct');
        } else if (i === userAnswer && userAnswer !== q.ans) {
            opt.classList.add('incorrect');
        }
    });

    // Show explanation
    document.getElementById('explanationText').textContent = q.exp;
    document.getElementById('explanation').classList.add('show');

    // Update nav grid
    updateNavGrid();
}

// Navigation
function prevQuestion() {
    if (examState.currentIndex > 0) {
        examState.currentIndex--;
        displayQuestion();
    }
}

function nextQuestion() {
    if (examState.currentIndex < examState.questions.length - 1) {
        examState.currentIndex++;
        displayQuestion();
    }
}

function goToQuestion(index) {
    examState.currentIndex = index;
    displayQuestion();
}

// Flag toggle
function toggleFlag() {
    if (examState.flagged.has(examState.currentIndex)) {
        examState.flagged.delete(examState.currentIndex);
    } else {
        examState.flagged.add(examState.currentIndex);
    }
    displayQuestion();
    saveProgress();
}

// Timer
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (examState.timeRemaining <= 0 || examState.submitted) {
            clearInterval(timerInterval);
            if (!examState.submitted) {
                alert("⏰ Time's up — submitting your exam.");
                forceSubmitExam();
            }
            return;
        }
        examState.timeRemaining--;
        updateTimerDisplay();
        if (examState.timeRemaining % 60 === 0) saveProgress();
    }, 1000);
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const hrs = Math.floor(examState.timeRemaining / 3600);
    const mins = Math.floor((examState.timeRemaining % 3600) / 60);
    const secs = examState.timeRemaining % 60;
    const display = `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = display;
    timerEl.className = 'timer';
    if (examState.timeRemaining <= 1800) timerEl.classList.add('warning');
    if (examState.timeRemaining <= 300) timerEl.classList.add('danger');
}

// Save progress — slim payload: question IDs + option ordering, not full text.
function saveProgress() {
    if (!examState.questions || examState.questions.length === 0) return;
    const slim = {
        version: 2,
        currentIndex: examState.currentIndex,
        answers: examState.answers,
        flagged: [...examState.flagged],
        timeRemaining: examState.timeRemaining,
        isReviewMode: examState.isReviewMode,
        studyMode: examState.studyMode,
        submitted: examState.submitted,
        questionRefs: examState.questions.map(q => ({
            id: q.id,
            order: q._optsOrder || q.opts.map((_, i) => i)
        }))
    };
    localStorage.setItem('azExamProgress', JSON.stringify(slim));
}

// Submit exam
function submitExam() {
    if (!confirm('Are you sure you want to submit? You cannot change answers after submitting.')) return;
    forceSubmitExam();
}

function forceSubmitExam() {
    examState.submitted = true;
    clearInterval(timerInterval);
    localStorage.removeItem('azExamProgress');
    showResults();
}

// Show results
function showResults() {
    document.getElementById('examScreen').classList.add('hidden');
    document.getElementById('resultsScreen').classList.remove('hidden');

    let correct = 0;
    const catScores = {};

    examState.questions.forEach((q, i) => {
        const cat = normalizeCategory(q.cat);
        if (!catScores[cat]) catScores[cat] = { correct: 0, total: 0 };
        catScores[cat].total++;

        const isCorrect = examState.answers[i] === q.ans;

        if (isCorrect) {
            correct++;
            catScores[cat].correct++;
            // Remove from missed if answered correctly
            removeMissedQuestion(q.id);
        } else {
            // Add to missed questions
            saveMissedQuestion(q.id);
        }

        // Record performance for weighted random
        recordQuestionPerformance(q.id, isCorrect);
    });

    const percent = Math.round((correct / examState.questions.length) * 100);
    const passed = percent >= 75;

    const circle = document.getElementById('scoreCircle');
    circle.className = `score-circle ${passed ? 'pass' : 'fail'}`;
    circle.innerHTML = `
        <div class="score-content">
            <div class="score-percent">${percent}<span class="score-mark">%</span></div>
            <div class="score-fraction">${correct} / ${examState.questions.length} correct</div>
        </div>
    `;

    const passFail = document.getElementById('passFailText');
    passFail.innerHTML = passed
        ? '<em>Passed.</em> A worthy showing.'
        : '<em>Not yet.</em> Review and try again.';
    passFail.className = passed ? 'pass-fail passed' : 'pass-fail failed';

    // Category breakdown
    const catDiv = document.getElementById('categoryScores');
    catDiv.innerHTML = '';
    Object.entries(catScores).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, scores]) => {
        const pct = Math.round((scores.correct / scores.total) * 100);
        catDiv.innerHTML += `<div class="category-score"><span>${cat}</span><span style="color: ${pct >= 75 ? '#10b981' : '#ef4444'}">${scores.correct}/${scores.total} (${pct}%)</span></div>`;
    });

    // Save score to history
    saveScoreToHistory(percent, correct, examState.questions.length, examState.studyMode);

    // Update stats dashboard for when user returns to start screen
    updateStatsDashboard();
}

// Review exam
function reviewExam() {
    examState.isReviewMode = true;
    examState.currentIndex = 0;
    document.getElementById('resultsScreen').classList.add('hidden');
    document.getElementById('examScreen').classList.remove('hidden');
    const timerEl = document.getElementById('timer');
    timerEl.textContent = 'Review';
    timerEl.classList.add('review');
    document.getElementById('flagBtn').style.display = 'none';
    document.getElementById('submitBtn').style.display = 'none';
    displayQuestion();
}

// Save score to history
function saveScoreToHistory(percent, correct, total, isStudyMode) {
    const history = JSON.parse(localStorage.getItem('azExamScoreHistory') || '[]');
    const entry = {
        date: new Date().toISOString(),
        percent: percent,
        correct: correct,
        total: total,
        passed: percent >= 75,
        mode: isStudyMode ? 'Study' : 'Exam'
    };
    history.unshift(entry); // Add to beginning
    // Keep only last 50 scores
    if (history.length > 50) history.pop();
    localStorage.setItem('azExamScoreHistory', JSON.stringify(history));
}

// Display score history on start screen
function displayScoreHistory() {
    const history = JSON.parse(localStorage.getItem('azExamScoreHistory') || '[]');
    const container = document.getElementById('scoresContainer');
    const logSection = document.getElementById('scoresLog');

    if (history.length === 0) {
        container.innerHTML = '<p class="no-scores">No previous attempts yet. Take an exam to see your scores here!</p>';
        return;
    }

    container.innerHTML = history.slice(0, 25).map(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const passClass = entry.percent >= 75 ? 'pass' : 'fail';
        const passIcon = entry.percent >= 75 ? '✓' : '✗';
        return `
            <div class="score-entry">
                <div>
                    <span class="date">${dateStr} ${timeStr}</span>
                    <span class="mode">${entry.mode}</span>
                </div>
                <div class="score ${passClass}">
                    ${passIcon} ${entry.percent}%
                </div>
            </div>
        `;
    }).join('');
}

// Clear score history
function clearScoreHistory() {
    if (confirm('Are you sure you want to clear all score history?')) {
        localStorage.removeItem('azExamScoreHistory');
        displayScoreHistory();
    }
}

// Load score history (called from window.onload)
function loadScoreHistory() {
    displayScoreHistory();
}

// Keyboard shortcut handler
function handleKeyboard(e) {
    // Only handle during exam
    if (document.getElementById('examScreen').classList.contains('hidden')) {
        return;
    }

    const key = e.key;

    // 1-4 to select answers
    if (['1', '2', '3', '4'].includes(key)) {
        const optIndex = parseInt(key) - 1;
        const options = document.querySelectorAll('#optionsContainer .option');
        if (options[optIndex] && !examState.submitted && !examState.isReviewMode) {
            selectAnswer(optIndex);
        }
        e.preventDefault();
    }

    // Arrow keys for navigation
    if (key === 'ArrowLeft') {
        prevQuestion();
        e.preventDefault();
    }
    if (key === 'ArrowRight') {
        nextQuestion();
        e.preventDefault();
    }

    // F to flag
    if (key.toLowerCase() === 'f') {
        toggleFlag();
        e.preventDefault();
    }

    // B to bookmark
    if (key.toLowerCase() === 'b') {
        toggleBookmark();
        e.preventDefault();
    }

    // ? to toggle shortcuts help
    if (key === '?') {
        const help = document.getElementById('shortcutsHelp');
        help.classList.toggle('show');
        e.preventDefault();
    }
}

// Bookmark toggle
function toggleBookmark() {
    const q = examState.questions[examState.currentIndex];
    const bookmarks = getBookmarkedQuestions();
    const btn = document.getElementById('bookmarkBtn');

    if (bookmarks.includes(q.id)) {
        removeBookmarkedQuestion(q.id);
        btn.textContent = '☆';
        btn.classList.remove('bookmarked');
    } else {
        saveBookmarkedQuestion(q.id);
        btn.textContent = '★';
        btn.classList.add('bookmarked');
    }
    updateStatsDashboard();
}

// Update bookmark button display
function updateBookmarkButton() {
    const q = examState.questions[examState.currentIndex];
    const bookmarks = getBookmarkedQuestions();
    const btn = document.getElementById('bookmarkBtn');

    if (bookmarks.includes(q.id)) {
        btn.textContent = '★';
        btn.classList.add('bookmarked');
    } else {
        btn.textContent = '☆';
        btn.classList.remove('bookmarked');
    }
}

// Export results to printable format
function exportResults() {
    let correct = 0;
    const catScores = {};

    examState.questions.forEach((q, i) => {
        const cat = normalizeCategory(q.cat);
        if (!catScores[cat]) catScores[cat] = { correct: 0, total: 0 };
        catScores[cat].total++;
        if (examState.answers[i] === q.ans) {
            correct++;
            catScores[cat].correct++;
        }
    });

    const percent = Math.round((correct / examState.questions.length) * 100);
    const passed = percent >= 75;

    let content = `
                <html>
                <head>
                    <title>Arizona RE Exam Results - ${new Date().toLocaleDateString()}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                        h1 { color: #1e3a5f; }
                        .score { font-size: 2rem; color: ${passed ? '#10b981' : '#ef4444'}; }
                        .category { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
                        .question { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                        .correct { border-left: 4px solid #10b981; }
                        .incorrect { border-left: 4px solid #ef4444; }
                        .explanation { font-size: 0.9rem; color: #666; margin-top: 10px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <h1>🌵 Arizona Real Estate Exam Results</h1>
                    <p>Date: ${new Date().toLocaleString()}</p>
                    <p class="score">${passed ? '✓ PASSED' : '✗ FAILED'} - ${percent}% (${correct}/${examState.questions.length})</p>
                    
                    <h2>Score by Category</h2>
                    ${Object.entries(catScores).sort().map(([cat, scores]) =>
        `<div class="category"><span>${escapeHtml(cat)}</span><span>${scores.correct}/${scores.total} (${Math.round(scores.correct / scores.total * 100)}%)</span></div>`
    ).join('')}

                    <h2>Question Details</h2>
                    ${examState.questions.map((q, i) => {
        const userAns = examState.answers[i];
        const isCorrect = userAns === q.ans;
        return `
                            <div class="question ${isCorrect ? 'correct' : 'incorrect'}">
                                <strong>Q${i + 1}:</strong> ${escapeHtml(q.q)}<br>
                                <strong>Your Answer:</strong> ${userAns !== undefined ? escapeHtml(q.opts[userAns]) : 'Not answered'}<br>
                                <strong>Correct Answer:</strong> ${escapeHtml(q.opts[q.ans])}<br>
                                <div class="explanation">${escapeHtml(q.exp)}</div>
                            </div>
                        `;
    }).join('')}
                    
                    <button class="no-print" onclick="window.print()" style="padding: 15px 30px; font-size: 1.1rem; cursor: pointer;">🖨️ Print / Save as PDF</button>
                </body>
                </html>
            `;

    const exportWindow = window.open('', '_blank');
    exportWindow.document.write(content);
    exportWindow.document.close();
}

// Initialize score history on page load
document.addEventListener('DOMContentLoaded', displayScoreHistory);
// Cheat Sheet Logic
function openCheatSheet() {
    document.getElementById('cheatSheetModal').style.display = 'block';
}

function closeCheatSheet() {
    document.getElementById('cheatSheetModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('cheatSheetModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
