
        // ==================== SETTINGS & STATE ====================
        let settings = {
            quizLength: 180,
            selectedCategories: new Set(),
            weightedRandom: false,
            shuffleAnswers: true,
            theme: 'light'
        };

        // Get all unique categories from question bank
        function getCategories() {
            const cats = new Set();
            questionBank.forEach(q => {
                // Get base category (before /)
                const baseCat = q.cat.split(' / ')[0];
                cats.add(baseCat);
            });
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
        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('azTheme', newTheme);
            document.querySelector('.theme-toggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
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

            // Count questions per category
            const catCounts = {};
            questionBank.forEach(q => {
                const baseCat = q.cat.split(' / ')[0];
                catCounts[baseCat] = (catCounts[baseCat] || 0) + 1;
            });

            grid.innerHTML = categories.map(cat => `
                <label class="category-item selected" onclick="toggleCategory('${cat}')">
                    <input type="checkbox" value="${cat}" checked>
                    ${cat} (${catCounts[cat] || 0})
                </label>
            `).join('');

            // Select all by default
            selectAllCategories();
        }

        // Update stats dashboard
        function updateStatsDashboard() {
            const history = JSON.parse(localStorage.getItem('azExamHistory') || '[]');
            const missed = getMissedQuestions();
            const bookmarks = getBookmarkedQuestions();

            document.getElementById('totalExams').textContent = history.length;

            if (history.length > 0) {
                const avgScore = Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / history.length);
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
            document.querySelector('.theme-toggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';

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
            let filtered = questionBank.filter(q => {
                const baseCat = q.cat.split(' / ')[0];
                return settings.selectedCategories.has(baseCat);
            });

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

            return questions.map((q, qIndex) => {
                if (shuffleOpts) {
                    // Create shuffled options with original index mapping
                    const optionsWithIndex = q.opts.map((opt, i) => ({ opt, originalIndex: i }));
                    const shuffledOptions = shuffleArray([...optionsWithIndex]);

                    // Find new correct answer index
                    const newAnsIndex = shuffledOptions.findIndex(o => o.originalIndex === q.ans);

                    return {
                        ...q,
                        opts: shuffledOptions.map(o => o.opt),
                        ans: newAnsIndex,
                        _originalAns: q.ans  // Keep original for reference
                    };
                }
                return { ...q };
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


        // Resume saved exam
        function resumeExam() {
            const saved = JSON.parse(localStorage.getItem('azExamProgress'));
            examState = {
                ...saved,
                flagged: new Set(saved.flagged)
            };
            showExamScreen();
        }

        // Show exam
        function showExamScreen() {
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('resultsScreen').classList.add('hidden');
            document.getElementById('examScreen').classList.remove('hidden');
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
                item.className = 'nav-item';
                item.textContent = i + 1;
                item.onclick = () => goToQuestion(i);
                grid.appendChild(item);
            }
            updateNavGrid();
        }

        // Update navigator grid
        function updateNavGrid() {
            const items = document.querySelectorAll('.nav-item');
            let answered = 0;
            let correct = 0;
            items.forEach((item, i) => {
                item.className = 'nav-item';
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
            document.getElementById('categoryTag').textContent = q.cat;
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
                div.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${opt}</span>`;
                if (!examState.isReviewMode && !(examState.studyMode && alreadyAnswered)) {
                    div.onclick = () => selectAnswer(i);
                } else {
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
            examState.answers[examState.currentIndex] = index;

            // In study mode, show feedback immediately
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
                    if (!examState.submitted) submitExam();
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

        // Save progress
        function saveProgress() {
            const toSave = {
                ...examState,
                flagged: [...examState.flagged]
            };
            localStorage.setItem('azExamProgress', JSON.stringify(toSave));
        }

        // Submit exam
        function submitExam() {
            if (!confirm('Are you sure you want to submit? You cannot change answers after submitting.')) return;
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
                if (!catScores[q.cat]) catScores[q.cat] = { correct: 0, total: 0 };
                catScores[q.cat].total++;

                const isCorrect = examState.answers[i] === q.ans;

                if (isCorrect) {
                    correct++;
                    catScores[q.cat].correct++;
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

            document.getElementById('scorePercent').textContent = `${percent}%`;
            document.getElementById('scoreText').textContent = `${correct}/${examState.questions.length}`;
            document.getElementById('scoreCircle').className = `score-circle ${passed ? 'pass' : 'fail'}`;
            document.getElementById('passFailText').textContent = passed ? '🎉 PASSED!' : '❌ Not Passed';
            document.getElementById('passFailText').style.color = passed ? '#10b981' : '#ef4444';

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
            document.getElementById('timer').textContent = 'Review Mode';
            document.getElementById('flagBtn').style.display = 'none';
            document.querySelector('.btn-success').style.display = 'none';
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
                const passClass = entry.passed ? 'pass' : 'fail';
                const passIcon = entry.passed ? '✓' : '✗';
                return `
                    <div class="score-entry">
                        <div>
                            <span class="date">${dateStr} ${timeStr}</span>
                            <span class="mode">${entry.mode}</span>
                        </div>
                        <span class="score ${passClass}">${passIcon} ${entry.percent}%</span>
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
                if (!catScores[q.cat]) catScores[q.cat] = { correct: 0, total: 0 };
                catScores[q.cat].total++;
                if (examState.answers[i] === q.ans) {
                    correct++;
                    catScores[q.cat].correct++;
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
                `<div class="category"><span>${cat}</span><span>${scores.correct}/${scores.total} (${Math.round(scores.correct / scores.total * 100)}%)</span></div>`
            ).join('')}
                    
                    <h2>Question Details</h2>
                    ${examState.questions.map((q, i) => {
                const userAns = examState.answers[i];
                const isCorrect = userAns === q.ans;
                return `
                            <div class="question ${isCorrect ? 'correct' : 'incorrect'}">
                                <strong>Q${i + 1}:</strong> ${q.q}<br>
                                <strong>Your Answer:</strong> ${userAns !== undefined ? q.opts[userAns] : 'Not answered'}<br>
                                <strong>Correct Answer:</strong> ${q.opts[q.ans]}<br>
                                <div class="explanation">${q.exp}</div>
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
        window.onclick = function (event) {
            const modal = document.getElementById('cheatSheetModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
