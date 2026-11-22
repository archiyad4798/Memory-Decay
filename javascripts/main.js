(function () {
    let toastTimer;
    let lastTrigger = null;

    function showToast(message, type = 'success') {
        let region = document.getElementById('toast-region');
        if (!region) {
            region = document.createElement('div');
            region.id = 'toast-region';
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
            region.className = 'pointer-events-none fixed bottom-7 left-1/2 z-[80] flex w-[min(420px,calc(100%-32px))] -translate-x-1/2';
            document.body.append(region);
        }
        const toast = document.createElement('div');
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.className = 'w-full rounded-xl border border-white/10 bg-ink px-4 py-3 text-sm text-white shadow-lg';
        toast.textContent = message;
        region.replaceChildren(toast);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.remove(), 3200);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[character]));
    }

    function storageErrorMessage(error) {
        if (error && error.code === 'UPGRADE_BLOCKED') {
            return 'Another tab is blocking a database update. Close older tabs and reload.';
        }
        if (error && error.code === 'QUOTA_EXCEEDED') {
            return 'Browser storage is full. Free some space and retry.';
        }
        if (error && error.code === 'STORAGE_UNAVAILABLE') {
            return 'IndexedDB is unavailable. Check private browsing or storage permissions.';
        }
        return error && error.message ? error.message : 'The data could not be loaded. Please retry.';
    }

    function loadingMarkup(label = 'Loading…') {
        return `<div class="py-6 text-sm text-muted" role="status">${escapeHtml(label)}</div>`;
    }

    function errorMarkup(message, action = 'retry') {
        return `<div class="rounded-xl border border-[#e2b8b1] bg-[#f4dfdc] p-4 text-sm text-[#87554e]" role="alert">
            <p>${escapeHtml(message)}</p>
            <button type="button" data-retry="${escapeHtml(action)}" class="mt-3 rounded-[10px] border border-[#d9aaa3] bg-white px-3 py-2 text-xs font-semibold text-[#87554e]">Retry</button>
        </div>`;
    }

    function closeDialog(dialog) {
        if (dialog.open) dialog.close();
        dialog.remove();
        if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
        lastTrigger = null;
    }

    function openDialog(title, description, body, autofocus) {
        document.getElementById('memory-decay-dialog')?.remove();
        lastTrigger = document.activeElement;
        const dialog = document.createElement('dialog');
        dialog.id = 'memory-decay-dialog';
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'memory-decay-dialog-title');
        dialog.className = 'w-[min(470px,calc(100%-32px))] rounded-[20px] border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/35';
        dialog.innerHTML = `
<div class="p-6">
    <div class="mb-5 flex items-start justify-between gap-5">
        <div><h2 id="memory-decay-dialog-title" class="font-display text-2xl">${title}</h2>${description ? `<p class="mt-1 text-[13px] text-muted">${description}</p>` : ''}</div>
        <button type="button" data-dialog-close class="grid size-8 place-items-center rounded-lg text-lg text-muted hover:bg-soft focus:outline-none focus:ring-4 focus:ring-sage/20" aria-label="Close">×</button>
    </div>
    ${body}
</div>`;
        document.body.append(dialog);

        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const elements = [...dialog.querySelectorAll(focusableSelector)].filter(element => !element.hidden);
            if (!elements.length) return;
            if (event.shiftKey && document.activeElement === elements[0]) {
                event.preventDefault();
                elements[elements.length - 1].focus();
            } else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) {
                event.preventDefault();
                elements[0].focus();
            }
        });
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            closeDialog(dialog);
        });
        dialog.addEventListener('click', event => {
            if (event.target === dialog) closeDialog(dialog);
        });
        dialog.querySelectorAll('[data-dialog-close]').forEach(button => {
            button.addEventListener('click', () => closeDialog(dialog));
        });

        dialog.showModal();
        if (autofocus) dialog.querySelector(autofocus)?.focus();
        else dialog.querySelector('[data-dialog-close]').focus();
        return dialog;
    }

    function openAddConcept() {
        const dialog = openDialog(
            'Add a concept',
            'Create a learning item to start tracking recall.',
            `<form data-add-form novalidate class="grid gap-4">
                <label class="grid gap-1.5 text-xs font-bold" for="concept-title">Title
                    <input id="concept-title" name="title" required minlength="3" placeholder="e.g. JavaScript closures" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
                    <span data-title-error class="text-xs font-normal text-[#87554e]" aria-live="polite"></span>
                </label>
                <label class="grid gap-1.5 text-xs font-bold" for="concept-material">Material
                    <textarea id="concept-material" name="material" required minlength="10" rows="5" placeholder="Describe the idea or facts to recall." class="resize-none rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15"></textarea>
                    <span data-material-error class="text-xs font-normal text-[#87554e]" aria-live="polite"></span>
                </label>
                <label class="grid gap-1.5 text-xs font-bold" for="concept-keywords">Keywords
                    <input id="concept-keywords" name="keywords" required placeholder="closures, scope, lexical environment" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
                    <span data-keyword-error class="text-xs font-normal text-[#87554e]" aria-live="polite"></span>
                </label>
                <div class="mt-1 flex justify-end gap-2">
                    <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
                    <button type="submit" data-save-concept disabled class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Save concept</button>
                </div>
            </form>`,
            '#concept-title'
        );
        const form = dialog.querySelector('[data-add-form]');
        const title = form.querySelector('#concept-title');
        const material = form.querySelector('#concept-material');
        const keywords = form.querySelector('#concept-keywords');
        const submit = form.querySelector('[data-save-concept]');

        function validate(showErrors = false) {
            const titleValid = title.value.trim().length >= 3;
            const materialValid = material.value.trim().length >= 10;
            const keywordsValid = keywords.value.split(',').some(value => value.trim());
            if (showErrors) {
                form.querySelector('[data-title-error]').textContent = titleValid ? '' : 'Enter a title with at least 3 characters.';
                form.querySelector('[data-material-error]').textContent = materialValid ? '' : 'Enter at least 10 characters of material.';
                form.querySelector('[data-keyword-error]').textContent = keywordsValid ? '' : 'Enter at least one keyword.';
                title.setAttribute('aria-invalid', String(!titleValid));
                material.setAttribute('aria-invalid', String(!materialValid));
                keywords.setAttribute('aria-invalid', String(!keywordsValid));
            }
            submit.disabled = !(titleValid && materialValid && keywordsValid);
            return titleValid && materialValid && keywordsValid;
        }
        [title, material, keywords].forEach(input => {
            input.addEventListener('input', () => validate(false));
            input.addEventListener('blur', () => validate(true));
        });
        validate(false);
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!validate(true)) {
                showToast('Complete the required fields.', 'error');
                return;
            }
            submit.disabled = true;
            submit.textContent = 'Saving…';
            const now = Date.now();
            const storage = globalThis.MemoryDecayStorage;
            if (!storage) {
                closeDialog(dialog);
                showToast('Storage is unavailable.', 'error');
                return;
            }
            storage.addConcept({
                title: title.value.trim(),
                raw: material.value.trim(),
                keywords: keywords.value.split(',').map(keyword => keyword.trim()).filter(Boolean),
                createdAt: now,
                decayRate: 0.3,
                nextReviewAt: now,
                state: 'new'
            }).then(() => {
                closeDialog(dialog);
                showToast('Concept added successfully.');
                window.dispatchEvent(new CustomEvent('memory-decay-data-changed'));
                if (document.body.dataset.page === 'concepts') loadConceptsPage();
            }).catch(error => {
                submit.disabled = false;
                submit.textContent = 'Save concept';
                showToast(storageErrorMessage(error), 'error');
            });
        });
    }

    function openEditConcept(concept) {
        const dialog = openDialog(
            'Edit concept',
            'Update the title, material, and keywords.',
            `<form data-edit-form novalidate class="grid gap-4">
                <label class="grid gap-1.5 text-xs font-bold" for="edit-title">Title
                    <input id="edit-title" required minlength="3" value="${escapeHtml(concept.title)}" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
                    <span data-edit-title-error class="text-xs font-normal text-[#87554e]" aria-live="polite"></span>
                </label>
                <label class="grid gap-1.5 text-xs font-bold" for="edit-material">Material
                    <textarea id="edit-material" required minlength="10" rows="5" class="resize-none rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15">${escapeHtml(concept.raw)}</textarea>
                    <span data-edit-material-error class="text-xs font-normal text-[#87554e]" aria-live="polite"></span>
                </label>
                <label class="grid gap-1.5 text-xs font-bold" for="edit-keywords">Keywords
                    <input id="edit-keywords" required value="${escapeHtml(concept.keywords.join(', '))}" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
                    <span data-edit-keyword-error class="text-xs font-normal text-[#87554e]" aria-live="polite"></span>
                </label>
                <div class="mt-1 flex justify-end gap-2">
                    <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
                    <button type="submit" data-edit-submit class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Save changes</button>
                </div>
            </form>`,
            '#edit-title'
        );
        const form = dialog.querySelector('[data-edit-form]');
        const title = form.querySelector('#edit-title');
        const material = form.querySelector('#edit-material');
        const keywords = form.querySelector('#edit-keywords');
        const submit = form.querySelector('[data-edit-submit]');

        function validate(showErrors = false) {
            const titleValid = title.value.trim().length >= 3;
            const materialValid = material.value.trim().length >= 10;
            const keywordValid = keywords.value.split(',').some(keyword => keyword.trim());
            if (showErrors) {
                form.querySelector('[data-edit-title-error]').textContent = titleValid ? '' : 'Enter a title with at least 3 characters.';
                form.querySelector('[data-edit-material-error]').textContent = materialValid ? '' : 'Enter at least 10 characters of material.';
                form.querySelector('[data-edit-keyword-error]').textContent = keywordValid ? '' : 'Enter at least one keyword.';
            }
            submit.disabled = !(titleValid && materialValid && keywordValid);
            return titleValid && materialValid && keywordValid;
        }
        [title, material, keywords].forEach(input => {
            input.addEventListener('input', () => validate(false));
            input.addEventListener('blur', () => validate(true));
        });
        validate(true);
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!validate(true)) {
                showToast('Complete the required fields.', 'error');
                return;
            }
            submit.disabled = true;
            submit.textContent = 'Saving…';
            globalThis.MemoryDecayStorage.updateConcept({
                ...concept,
                title: title.value.trim(),
                raw: material.value.trim(),
                keywords: keywords.value.split(',').map(keyword => keyword.trim()).filter(Boolean)
            }).then(() => {
                closeDialog(dialog);
                showToast('Concept updated successfully.');
                window.dispatchEvent(new CustomEvent('memory-decay-data-changed'));
                if (document.body.dataset.page === 'concepts') loadConceptsPage();
                if (document.body.dataset.page === 'concept') loadConceptDetail();
            }).catch(error => {
                submit.disabled = false;
                submit.textContent = 'Save changes';
                showToast(storageErrorMessage(error), 'error');
            });
        });
    }

    function openDeleteConcept(concept) {
        const dialog = openDialog(
            'Delete concept?',
            `This will permanently remove ${escapeHtml(concept.title)} and its recall history.`,
            `<div class="mt-5 flex justify-end gap-2">
                <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
                <button type="button" data-delete-confirm class="rounded-[10px] border border-[#e2b8b1] bg-white px-4 py-2.5 text-sm font-medium text-[#87554e]">Delete</button>
            </div>`
        );
        dialog.querySelector('[data-delete-confirm]').addEventListener('click', () => {
            const button = dialog.querySelector('[data-delete-confirm]');
            button.disabled = true;
            button.textContent = 'Deleting…';
            globalThis.MemoryDecayStorage.deleteConcept(concept.id).then(() => {
                closeDialog(dialog);
                showToast('Concept deleted.');
                window.dispatchEvent(new CustomEvent('memory-decay-data-changed'));
                if (document.body.dataset.page === 'concepts') loadConceptsPage();
                if (document.body.dataset.page === 'concept') window.location.href = 'concepts.html';
            }).catch(error => {
                button.disabled = false;
                button.textContent = 'Delete';
                showToast(storageErrorMessage(error), 'error');
            });
        });
    }

    function latestScore(concept, tests) {
        const items = tests
            .filter(test => test.conceptId === concept.id && Number.isFinite(test.score))
            .sort((a, b) => (b.at || 0) - (a.at || 0));
        return items.length ? items[0].score : 0;
    }

    function stateStyle(state) {
        if (state === 'stable') return ['bg-[#dfeee1] text-[#42624a]', 'bg-[#5f8b68]'];
        if (state === 'reinforcement-needed') return ['bg-[#f5ead5] text-[#82633b]', 'bg-[#b78b4d]'];
        if (state === 'at-risk') return ['bg-[#f4dfdc] text-[#87554e]', 'bg-[#ae6960]'];
        return ['bg-[#edf0eb] text-muted', 'bg-sage'];
    }

    async function loadDashboardPage() {
        const due = document.getElementById('dashboard-due');
        const status = document.getElementById('dashboard-status');
        const chart = document.getElementById('dashboard-chart');
        if (!due && !status && !chart) return;
        if (due) due.innerHTML = loadingMarkup('Loading concepts…');
        if (status) status.innerHTML = loadingMarkup('Loading status…');
        if (chart) chart.innerHTML = loadingMarkup('Loading retention…');
        try {
            const [concepts, tests] = await Promise.all([
                globalThis.MemoryDecayStorage.listConcepts(),
                globalThis.MemoryDecayStorage.listTests()
            ]);
            const engine = globalThis.MemoryDecayEngine;
            const now = Date.now();
            const dueConcepts = engine.getDue(concepts, tests, now);

            if (due) {
                due.innerHTML = dueConcepts.length
                    ? dueConcepts.map(concept => `
                        <a href="src/pages/concept.html?id=${encodeURIComponent(concept.id)}" class="flex w-full items-center justify-between border-b border-[#eef0ec] py-2.5 text-left last:border-0">
                            <span><strong class="block text-[13px]">${escapeHtml(concept.title)}</strong><span class="mt-0.5 block text-[11px] text-[#8a928d]">${escapeHtml(engine.relativeDueLabel(concept.nextReviewAt, now))}</span></span>
                            <span class="text-xs text-sage-dark">${latestScore(concept, tests)}% ›</span>
                        </a>`).join('')
                    : `<div class="py-3 text-sm text-muted">No concepts due.</div>
                       <button type="button" data-popup="add" class="mt-2 text-xs font-semibold text-sage-dark">Add your first concept</button>`;
            }

            if (status) {
                const average = engine.averageRetention(tests);
                const count = engine.reviewsCompleted(tests);
                status.innerHTML = `
                    <div class="grid grid-cols-[1fr_auto] items-center gap-3">
                        <div><p class="text-[13px] font-semibold">Concepts tracked</p><div class="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[#edf0eb]"><div class="h-full rounded-full bg-sage" style="width:${Math.min(concepts.length * 20, 100)}%"></div></div></div>
                        <span class="text-xs text-muted">${concepts.length}</span>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] items-center gap-3">
                        <div><p class="text-[13px] font-semibold">Reviews completed</p><div class="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[#edf0eb]"><div class="h-full rounded-full bg-sage" style="width:${Math.min(count * 10, 100)}%"></div></div></div>
                        <span class="text-xs text-muted">${count}</span>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] items-center gap-3">
                        <div><p class="text-[13px] font-semibold">Average retention</p><div class="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[#edf0eb]"><div class="h-full rounded-full bg-sage" style="width:${average}%"></div></div></div>
                        <span class="text-xs text-muted">${average}%</span>
                    </div>`;
            }

            if (chart) {
                if (!tests.length) {
                    chart.innerHTML = `<div class="grid h-[280px] place-items-center text-center"><div><p class="font-display text-xl">No retention history</p><p class="mt-1 text-sm text-muted">Complete a recall test to begin charting retention.</p></div></div>`;
                } else {
                    const history = engine.retentionHistory(60, tests, now);
                    const buckets = [];
                    for (let index = 0; index < history.length; index += 10) {
                        const chunk = history.slice(index, index + 10).filter(item => item.count);
                        buckets.push(chunk.length ? Math.round(chunk.reduce((sum, item) => sum + item.average, 0) / chunk.length) : 0);
                    }
                    while (buckets.length < 6) buckets.unshift(0);
                    const chartPoints = buckets.slice(-6).map((score, index) => `${22 + index * 171},${220 - score * 1.9}`).join(' ');
                    chart.innerHTML = `
                        <svg viewBox="0 0 900 280" role="img" aria-label="Average retention trend" class="h-[280px] w-full overflow-visible">
                            <g stroke="#e4e7e1"><line x1="8" y1="220" x2="892" y2="220"/><line x1="8" y1="158" x2="892" y2="158"/><line x1="8" y1="96" x2="892" y2="96"/><line x1="8" y1="34" x2="892" y2="34"/></g>
                            <polyline points="${chartPoints}" fill="none" stroke="#53665a" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>
                            ${buckets.slice(-6).map((score, index) => `<circle cx="${22 + index * 171}" cy="${220 - score * 1.9}" r="4.5" fill="#fbfaf5" stroke="#53665a" stroke-width="2"/>`).join('')}
                        </svg>
                        <div class="flex justify-between px-3 text-[11px] text-[#8a928d]"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>`;
                }
            }
        } catch (error) {
            const message = storageErrorMessage(error);
            if (due) due.innerHTML = errorMarkup(message);
            if (status) status.innerHTML = errorMarkup(message);
            if (chart) chart.innerHTML = errorMarkup(message);
            showToast(message, 'error');
        }
    }

    async function loadConceptsPage() {
        const list = document.querySelector('[data-concept-list]');
        const noConcepts = document.querySelector('[data-concept-empty]:not([data-no-match])');
        const noMatch = document.querySelector('[data-no-match]');
        if (!list) return;
        list.innerHTML = loadingMarkup('Loading concepts…');
        if (noConcepts) noConcepts.hidden = true;
        if (noMatch) noMatch.hidden = true;
        try {
            const [concepts, tests] = await Promise.all([
                globalThis.MemoryDecayStorage.listConcepts(),
                globalThis.MemoryDecayStorage.listTests()
            ]);
            const engine = globalThis.MemoryDecayEngine;
            const stateCounts = { new: 0, stable: 0, 'reinforcement-needed': 0, 'at-risk': 0 };
            const search = document.getElementById('concept-search');
            const filter = document.getElementById('concept-filter');
            const sort = document.getElementById('concept-sort');

            const enriched = concepts.map(concept => {
                const conceptTests = tests.filter(test => test.conceptId === concept.id);
                const state = engine.classify(concept, conceptTests);
                stateCounts[state] = (stateCounts[state] || 0) + 1;
                return {
                    ...concept,
                    state,
                    score: latestScore(concept, tests),
                    testCount: conceptTests.length
                };
            });
            const tiles = document.querySelectorAll('[data-state-count]');
            tiles.forEach(tile => {
                tile.textContent = String(stateCounts[tile.dataset.stateCount] || 0);
            });

            function render() {
                const term = (search?.value || '').trim().toLowerCase();
                const state = filter?.value || 'all';
                let visible = enriched.filter(concept =>
                    (!term || `${concept.title} ${concept.raw} ${concept.keywords.join(' ')}`.toLowerCase().includes(term)) &&
                    (state === 'all' || concept.state === state)
                );
                if (sort?.value === 'lowest') visible.sort((a, b) => a.score - b.score);
                if (sort?.value === 'newest') visible.sort((a, b) => b.createdAt - a.createdAt);
                if (sort?.value === 'due') visible.sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0));

                if (!concepts.length) {
                    list.innerHTML = '';
                    if (noConcepts) noConcepts.hidden = false;
                    if (noMatch) noMatch.hidden = true;
                    return;
                }
                if (!visible.length) {
                    list.innerHTML = '';
                    if (noConcepts) noConcepts.hidden = true;
                    if (noMatch) noMatch.hidden = false;
                    return;
                }
                if (noConcepts) noConcepts.hidden = true;
                if (noMatch) noMatch.hidden = true;
                list.innerHTML = visible.map(concept => {
                    const [badgeClass, dotClass] = stateStyle(concept.state);
                    const label = concept.state.replaceAll('-', ' ');
                    return `<div data-concept-card data-state="${escapeHtml(concept.state)}" data-score="${concept.score}" data-due="${concept.nextReviewAt || 0}" data-newest="${concept.createdAt || 0}" class="rounded-2xl border border-line bg-white">
                        <a href="concept.html?id=${encodeURIComponent(concept.id)}" class="group block w-full p-5 text-left transition hover:-translate-y-0.5">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                                <div><div class="flex items-center gap-2"><span class="size-2 rounded-full ${dotClass}"></span><h2 class="font-display text-xl">${escapeHtml(concept.title)}</h2></div><p class="mt-2 max-w-2xl text-sm leading-6 text-muted">${escapeHtml(concept.raw)}</p></div>
                                <span class="rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}">${escapeHtml(label)}</span>
                            </div>
                            <div class="mt-5 grid gap-3 border-t border-[#eef0ec] pt-4 text-sm sm:grid-cols-3"><span><b class="text-ink">${concept.score}%</b> <span class="text-muted">current recall</span></span><span><b class="text-ink">${concept.testCount}</b> <span class="text-muted">recall tests</span></span><span><b class="text-ink">${escapeHtml(engine.relativeDueLabel(concept.nextReviewAt, Date.now()))}</b> <span class="text-muted">next review</span></span></div>
                        </a>
                        <div class="flex justify-end gap-2 px-5 pb-4">
                            <button type="button" data-edit-concept="${escapeHtml(concept.id)}" class="rounded-[10px] border border-line bg-white px-3 py-2 text-xs font-medium">Edit</button>
                            <button type="button" data-delete-concept="${escapeHtml(concept.id)}" class="rounded-[10px] border border-[#e2b8b1] bg-white px-3 py-2 text-xs font-medium text-[#87554e]">Delete</button>
                        </div>
                    </div>`;
                }).join('');
                list.querySelectorAll('[data-edit-concept]').forEach(button => {
                    button.addEventListener('click', () => openEditConcept(enriched.find(concept => concept.id === button.dataset.editConcept)));
                });
                list.querySelectorAll('[data-delete-concept]').forEach(button => {
                    button.addEventListener('click', () => openDeleteConcept(enriched.find(concept => concept.id === button.dataset.deleteConcept)));
                });
            }
            render();
            [search, filter, sort].forEach(control => control?.addEventListener(control === search ? 'input' : 'change', render));
        } catch (error) {
            list.innerHTML = errorMarkup(storageErrorMessage(error));
            showToast(storageErrorMessage(error), 'error');
        }
    }

    async function loadConceptDetail() {
        const main = document.querySelector('main');
        if (!main) return;
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) {
            main.innerHTML = `<section class="mx-auto max-w-2xl rounded-2xl border border-dashed border-line bg-white p-8 text-center"><h1 class="font-display text-2xl">No concept selected</h1><p class="mt-2 text-sm text-muted">Choose a concept from your library to view its details.</p><a href="concepts.html" class="mt-5 inline-flex rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Open concepts</a></section>`;
            return;
        }
        main.innerHTML = loadingMarkup('Loading concept…');
        try {
            const [concept, tests] = await Promise.all([
                globalThis.MemoryDecayStorage.getConcept(id),
                globalThis.MemoryDecayStorage.listTests(id)
            ]);
            if (!concept) {
                main.innerHTML = `<section class="mx-auto max-w-2xl rounded-2xl border border-dashed border-line bg-white p-8 text-center"><h1 class="font-display text-2xl">Concept not found</h1><p class="mt-2 text-sm text-muted">It may have been deleted or is unavailable.</p><a href="concepts.html" class="mt-5 inline-flex rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Open concepts</a></section>`;
                return;
            }
            const engine = globalThis.MemoryDecayEngine;
            const state = engine.classify(concept, tests);
            const [badgeClass, dotClass] = stateStyle(state);
            const score = latestScore(concept, tests);
            const history = tests.slice().sort((a, b) => b.at - a.at);
            main.innerHTML = `
                <nav aria-label="Breadcrumb" class="mb-5 flex items-center gap-2 text-sm text-muted"><a href="concepts.html" class="hover:text-ink">Concepts</a><span aria-hidden="true">›</span><span aria-current="page" class="text-ink">${escapeHtml(concept.title)}</span></nav>
                <div class="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px]">
                    <section class="relative overflow-hidden rounded-2xl border border-line bg-white before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#d9dfd7]">
                        <div class="border-b border-dashed border-[#d9ddd7] px-[22px] py-[17px]">
                            <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a928c]">Concept</p><h1 class="mt-1 font-display text-3xl">${escapeHtml(concept.title)}</h1></div><span class="rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}">${escapeHtml(state.replaceAll('-', ' '))}</span></div>
                        </div>
                        <div class="p-[22px]"><p class="text-sm font-bold">Material</p><p class="mt-3 max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-muted">${escapeHtml(concept.raw)}</p><div class="mt-6 border-t border-[#eef0ec] pt-5"><p class="text-sm font-bold">Keywords</p><div class="mt-3 flex flex-wrap gap-2">${concept.keywords.map(keyword => `<span class="rounded-full bg-[#edf0eb] px-3 py-1.5 text-xs">${escapeHtml(keyword)}</span>`).join('')}</div></div></div>
                    </section>
                    <aside class="grid content-start gap-[18px]">
                        <section class="rounded-2xl border border-line bg-white p-[22px]"><p class="text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a928c]">Current recall</p><p class="mt-2 font-display text-4xl">${score}%</p><div class="mt-4 h-[7px] overflow-hidden rounded-full bg-[#edf0eb]"><div class="h-full rounded-full bg-sage" style="width:${score}%"></div></div><a href="recall.html?id=${encodeURIComponent(concept.id)}" class="mt-5 block rounded-[10px] bg-sage-dark px-4 py-2.5 text-center text-sm font-medium text-white">Start review</a></section>
                        <section class="rounded-2xl border border-line bg-white p-[22px]"><div class="flex justify-between text-sm"><b>Next review</b><span class="text-muted">${escapeHtml(engine.relativeDueLabel(concept.nextReviewAt, Date.now()))}</span></div><div class="mt-4 flex justify-between text-sm"><b>Recall tests</b><span class="text-muted">${tests.length} completed</span></div><div class="mt-5 flex gap-2"><button type="button" data-detail-edit class="flex-1 rounded-[10px] border border-line px-3 py-2 text-sm">Edit</button><button type="button" data-detail-delete class="flex-1 rounded-[10px] border border-[#e2b8b1] px-3 py-2 text-sm text-[#87554e]">Delete</button></div></section>
                    </aside>
                </div>
                <section class="mt-[18px] rounded-2xl border border-line bg-white p-[22px]"><h2 class="font-display text-xl">Review history</h2>${history.length ? `<div class="mt-4 grid gap-2">${history.map(test => `<div class="flex justify-between border-b border-[#eef0ec] py-3 text-sm last:border-0"><span><b>${escapeHtml(engine.classify(concept, [test]))}</b></span><strong>${test.score}%</strong></div>`).join('')}</div>` : `<p class="mt-4 text-sm text-muted">No recall tests yet.</p>`}</section>`;
            main.querySelector('[data-detail-edit]').addEventListener('click', () => openEditConcept(concept));
            main.querySelector('[data-detail-delete]').addEventListener('click', () => openDeleteConcept(concept));
        } catch (error) {
            main.innerHTML = errorMarkup(storageErrorMessage(error));
            showToast(storageErrorMessage(error), 'error');
        }
    }

    const root = document.body.dataset.root || '.';
    const active = document.body.dataset.active || 'dashboard';
    const pagePath = name => name ? `${root}/src/pages/${name}.html` : `${root}/index.html`;

    const header = document.getElementById('shared-header');
    if (header) {
        header.innerHTML = `
<header class="flex h-[86px] items-center justify-between border-b border-line px-[18px] sm:px-7">
    <a href="${pagePath()}" class="flex items-center gap-3 font-display text-[23px] tracking-[-.5px] sm:text-[28px]" aria-label="Memory Decay home">
        <span class="grid size-[34px] place-items-center rounded-full border-[1.5px] border-ink font-sans">
            <svg aria-hidden="true" viewBox="0 0 24 24" class="size-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 10-2.34 5.66"/><path d="M20 4v7h-7"/></svg>
        </span>
        Memory Decay
    </a>
</header>`;
    }

    const sidebar = document.getElementById('shared-sidebar');
    if (sidebar) {
        const navClass = name => `nav-button ${active === name ? 'border-[#c8d1c6] bg-[#dfe6dd] text-sage-dark' : 'border-transparent text-muted hover:bg-[#ecefe9]'}`;
        sidebar.innerHTML = `
<aside class="border-b border-line bg-[#f7f6f0] px-3 py-3 sm:relative sm:h-full sm:border-b-0 sm:border-r sm:px-4 sm:py-6">
    <p class="mb-3 ml-2.5 mt-1.5 hidden text-[10px] font-bold uppercase tracking-[1.5px] text-[#8a928c] sm:block">Workspace</p>
    <nav class="grid grid-cols-3 gap-2 sm:grid-cols-1" aria-label="Workspace navigation">
        <a href="${pagePath()}" ${active === 'dashboard' ? 'aria-current="page"' : ''} class="${navClass('dashboard')}"><svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 8h14M8 8v9"/></svg><span>Dashboard</span></a>
        <a href="${pagePath('concepts')}" ${active === 'concepts' ? 'aria-current="page"' : ''} class="${navClass('concepts')}"><svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 3v14M3 10h14"/></svg><span>Concepts</span></a>
        <a href="${pagePath('settings')}" ${active === 'settings' ? 'aria-current="page"' : ''} class="${navClass('settings')}"><svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.35 4.35l2.12 2.12M13.53 13.53l2.12 2.12M15.65 4.35l-2.12 2.12M6.47 13.53l-2.12 2.12"/></svg><span>Settings</span></a>
    </nav>
</aside>`;
    }

    const floating = document.getElementById('shared-floating-ui');
    if (floating) {
        floating.innerHTML = `<button type="button" data-popup="add" aria-label="Add concept" class="fixed bottom-7 right-8 z-30 grid size-[50px] place-items-center rounded-[15px] bg-sage-dark text-[25px] text-white shadow-[0_10px_24px_rgba(64,84,71,.22)] transition hover:-translate-y-0.5 hover:bg-[#35483c]">+</button>`;
    }

    document.addEventListener('click', event => {
        if (event.target.closest('[data-popup="add"]')) openAddConcept();
        const retry = event.target.closest('[data-retry]');
        if (retry) {
            if (document.body.dataset.active === 'dashboard') loadDashboardPage();
            if (document.body.dataset.page === 'concepts') loadConceptsPage();
            if (document.body.dataset.page === 'concept') loadConceptDetail();
        }
    });

    window.addEventListener('memory-decay-data-changed', () => {
        if (document.body.dataset.active === 'dashboard') loadDashboardPage();
        if (document.body.dataset.page === 'concepts') loadConceptsPage();
        if (document.body.dataset.page === 'concept') loadConceptDetail();
    });

    const page = document.body.dataset.page;
    if (document.body.dataset.active === 'dashboard') loadDashboardPage();
    if (page === 'concepts') loadConceptsPage();
    if (page === 'concept') loadConceptDetail();
    if (page === 'settings') {
        fetch(`${root}/package.json`)
            .then(response => {
                if (!response.ok) throw new Error('Unable to read app version.');
                return response.json();
            })
            .then(metadata => {
                const target = document.querySelector('[data-app-version]');
                if (target) target.textContent = String(metadata.version || 'Unavailable');
            })
            .catch(() => {
                const target = document.querySelector('[data-app-version]');
                if (target) target.textContent = 'Unavailable';
            });
    }
}());
