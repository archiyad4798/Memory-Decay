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

    function setupKeywordChips(form, input, initialKeywords, onChange) {
        const list = form.querySelector('[data-keyword-chips]');
        const keywords = [];
        const addKeywords = values => {
            values.map(value => value.trim()).filter(Boolean).forEach(value => {
                if (!keywords.some(keyword => keyword.toLocaleLowerCase() === value.toLocaleLowerCase())) keywords.push(value);
            });
        };
        addKeywords(initialKeywords);

        const render = () => {
            list.replaceChildren();
            keywords.forEach((keyword, index) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'inline-flex items-center gap-1 rounded-full bg-[#edf0eb] px-2.5 py-1 text-xs text-ink hover:bg-soft';
                chip.dataset.keywordIndex = String(index);
                chip.setAttribute('aria-label', `Remove keyword ${keyword}`);
                chip.textContent = `${keyword} ×`;
                list.append(chip);
            });
        };
        const commitInput = () => {
            addKeywords(input.value.split(','));
            input.value = '';
            render();
            onChange();
        };

        list.addEventListener('click', event => {
            const chip = event.target.closest('[data-keyword-index]');
            if (!chip) return;
            keywords.splice(Number(chip.dataset.keywordIndex), 1);
            render();
            onChange();
            input.focus();
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                if (input.value.trim()) commitInput();
            } else if (event.key === 'Backspace' && !input.value && keywords.length) {
                keywords.pop();
                render();
                onChange();
            }
        });
        input.addEventListener('input', () => {
            if (input.value.includes(',')) {
                const values = input.value.split(',');
                input.value = values.pop();
                addKeywords(values);
                render();
            }
            onChange();
        });
        render();
        return { values: () => [...keywords] };
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
                    <div data-keyword-chips class="flex flex-wrap gap-1.5" aria-live="polite"></div>
                    <input id="concept-keywords" name="keywords" placeholder="Type a keyword, then press Enter" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
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
        let validate = () => false;
        const keywordChips = setupKeywordChips(form, keywords, [], () => validate(false));

        validate = (showErrors = false) => {
            const titleValid = title.value.trim().length >= 3;
            const materialValid = material.value.trim().length >= 10;
            const keywordsValid = keywordChips.values().length > 0;
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
        };
        [title, material].forEach(input => {
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
                keywords: keywordChips.values(),
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
                    <div data-keyword-chips class="flex flex-wrap gap-1.5" aria-live="polite"></div>
                    <input id="edit-keywords" placeholder="Type a keyword, then press Enter" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
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
        let validate = () => false;
        const keywordChips = setupKeywordChips(form, keywords, concept.keywords, () => validate(false));

        validate = (showErrors = false) => {
            const titleValid = title.value.trim().length >= 3;
            const materialValid = material.value.trim().length >= 10;
            const keywordValid = keywordChips.values().length > 0;
            if (showErrors) {
                form.querySelector('[data-edit-title-error]').textContent = titleValid ? '' : 'Enter a title with at least 3 characters.';
                form.querySelector('[data-edit-material-error]').textContent = materialValid ? '' : 'Enter at least 10 characters of material.';
                form.querySelector('[data-edit-keyword-error]').textContent = keywordValid ? '' : 'Enter at least one keyword.';
            }
            submit.disabled = !(titleValid && materialValid && keywordValid);
            return titleValid && materialValid && keywordValid;
        };
        [title, material].forEach(input => {
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
                keywords: keywordChips.values()
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
                if (dueConcepts.length) {
                    due.innerHTML = dueConcepts.map(concept => `
                        <a href="src/pages/concept.html?id=${encodeURIComponent(concept.id)}" class="flex w-full items-center justify-between border-b border-[#eef0ec] py-2.5 text-left last:border-0">
                            <span><strong class="block text-[13px]">${escapeHtml(concept.title)}</strong><span class="mt-0.5 block text-[11px] text-[#8a928d]">${escapeHtml(engine.relativeDueLabel(concept.nextReviewAt, now))}</span></span>
                            <span class="text-xs text-sage-dark">${latestScore(concept, tests)}% ›</span>
                        </a>`).join('');
                } else if (!concepts.length) {
                    due.innerHTML = `<div class="py-3 text-sm text-muted">No concepts due.</div>
                        <button type="button" data-popup="add" class="mt-2 text-xs font-semibold text-sage-dark">Add your first concept</button>`;
                } else {
                    const nextReviewAt = Math.min(...concepts.map(concept => concept.nextReviewAt).filter(Number.isFinite));
                    due.innerHTML = `<div class="py-3 text-sm text-muted"><strong class="block text-ink">Nothing due</strong><span class="mt-1 block">Next review ${escapeHtml(engine.relativeDueLabel(nextReviewAt, now))}</span></div>`;
                }
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
                    const points = engine.retentionHistory(60, tests, now).filter(item => item.count);
                    const plot = { left: 58, right: 884, top: 24, bottom: 220 };
                    const width = plot.right - plot.left;
                    const height = plot.bottom - plot.top;
                    const xFor = (item, index) => points.length === 1
                        ? (plot.left + width / 2)
                        : (plot.left + index * (width / (points.length - 1)));
                    const yFor = score => plot.bottom - ((Math.max(0, Math.min(100, score)) / 100) * height);
                    const chartPoints = points.map((item, index) => `${xFor(item, index)},${yFor(item.average)}`).join(' ');
                    const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
                    const labelStep = Math.max(1, Math.ceil(points.length / 6));
                    const dateLabels = points.filter((item, index) => index % labelStep === 0 || index === points.length - 1);
                    chart.innerHTML = `
                        <svg viewBox="0 0 900 280" role="img" aria-label="Average retention trend with ${points.length} recorded day${points.length === 1 ? '' : 's'}" class="h-[280px] w-full overflow-visible">
                            <g stroke="#e4e7e1"><line x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}"/><line x1="${plot.left}" y1="${plot.bottom - height * .25}" x2="${plot.right}" y2="${plot.bottom - height * .25}"/><line x1="${plot.left}" y1="${plot.bottom - height * .5}" x2="${plot.right}" y2="${plot.bottom - height * .5}"/><line x1="${plot.left}" y1="${plot.bottom - height * .75}" x2="${plot.right}" y2="${plot.bottom - height * .75}"/><line x1="${plot.left}" y1="${plot.top}" x2="${plot.right}" y2="${plot.top}"/></g>
                            <g fill="#858e88" font-family="system-ui, sans-serif" font-size="11" text-anchor="end"><text x="50" y="${plot.bottom + 4}">0%</text><text x="50" y="${plot.bottom - height * .25 + 4}">25%</text><text x="50" y="${plot.bottom - height * .5 + 4}">50%</text><text x="50" y="${plot.bottom - height * .75 + 4}">75%</text><text x="50" y="${plot.top + 4}">100%</text></g>
                            ${points.length > 1 ? `<polyline points="${chartPoints}" fill="none" stroke="#53665a" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>` : ''}
                            ${points.map((item, index) => `<circle cx="${xFor(item, index)}" cy="${yFor(item.average)}" r="4.5" fill="#fbfaf5" stroke="#53665a" stroke-width="2"/>`).join('')}
                            <g fill="#858e88" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">${dateLabels.map(item => { const index = points.indexOf(item); return `<text x="${xFor(item, index)}" y="258">${dateFormatter.format(item.at)}</text>`; }).join('')}</g>
                        </svg>
                        <p class="mt-1 text-center text-[11px] text-[#8a928d]">Recorded review days</p>`;
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
        const noMatch = document.querySelector('[data-no-match]');
        if (!list) return;
        list.innerHTML = loadingMarkup('Loading concepts…');
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
                    list.innerHTML = `<div class="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                        <h2 class="font-display text-xl">No concepts yet</h2>
                        <p class="mt-2 text-sm text-muted">Add your first concept to begin building recall history.</p>
                        <button type="button" data-popup="add" class="mt-5 rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Add your first concept</button>
                    </div>`;
                    if (noMatch) noMatch.hidden = true;
                    return;
                }
                if (!visible.length) {
                    list.innerHTML = '';
                    if (noMatch) noMatch.hidden = false;
                    return;
                }
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

    async function loadRecallPage() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const content = document.querySelector('[data-recall-content]');
        const empty = document.querySelector('[data-recall-empty]');
        if (!content || !empty) return;
        if (!id) {
            content.hidden = true;
            empty.hidden = false;
            return;
        }

        content.hidden = false;
        empty.hidden = true;
        content.innerHTML = loadingMarkup('Loading recall…');
        try {
            const concept = await globalThis.MemoryDecayStorage.getConcept(id);
            if (!concept) {
                content.hidden = true;
                empty.hidden = false;
                return;
            }

            content.innerHTML = `
                <p class="text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a928c]">Recall test</p>
                <h1 class="mt-1 font-display text-3xl">${escapeHtml(concept.title)}</h1>
                <section data-material-state class="mt-5 rounded-2xl border border-line bg-white p-6">
                    <div class="flex items-center justify-between"><h2 class="font-display text-xl">Material</h2><span class="rounded-full bg-[#edf0eb] px-2.5 py-1 text-xs font-semibold text-muted">Visible before recall</span></div>
                    <p class="mt-4 whitespace-pre-wrap rounded-xl bg-[#f7f8f4] p-5 text-sm leading-7 text-muted">${escapeHtml(concept.raw)}</p>
                    <div class="mt-5 flex justify-end"><button type="button" data-lock-start class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Lock and start</button></div>
                </section>
                <section data-answer-state hidden class="mt-[18px] rounded-2xl border border-line bg-white p-6">
                    <label class="grid gap-2 text-xs font-bold" for="answer">Free recall
                        <textarea id="answer" maxlength="10000" rows="7" placeholder="Write what you remember..." class="resize-none rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15"></textarea>
                    </label>
                    <div class="mt-2 flex justify-between gap-3 text-xs text-muted"><span>Write in your own words</span><span data-character-count aria-live="polite">0 characters</span></div>
                    <div class="mt-5 flex justify-end"><button type="button" data-submit-recall disabled class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Submit recall</button></div>
                </section>`;

            const material = content.querySelector('[data-material-state]');
            const answerState = content.querySelector('[data-answer-state]');
            const lock = content.querySelector('[data-lock-start]');
            const textarea = content.querySelector('#answer');
            const count = content.querySelector('[data-character-count]');
            const submit = content.querySelector('[data-submit-recall]');
            let unsaved = false;

            lock.addEventListener('click', () => {
                material.hidden = true;
                answerState.hidden = false;
                textarea.focus();
                showToast('Material locked. Recall in your own words.');
            });

            textarea.addEventListener('input', () => {
                const length = textarea.value.length;
                count.textContent = `${length} character${length === 1 ? '' : 's'}`;
                submit.disabled = length === 0;
                unsaved = length > 0;
            });

            submit.addEventListener('click', async () => {
                if (!textarea.value.trim()) {
                    showToast('Enter a recall before submitting.', 'error');
                    return;
                }
                submit.disabled = true;
                submit.textContent = 'Scoring…';
                try {
                    const now = Date.now();
                    const engine = globalThis.MemoryDecayEngine;
                    const storage = globalThis.MemoryDecayStorage;
                    const allTests = await storage.listTests(id);
                    const scored = engine.scoreRecall(textarea.value, concept);
                    const test = await storage.addTest({
                        conceptId: id,
                        at: now,
                        score: scored.score,
                        answer: textarea.value
                    });
                    const reviewedCount = allTests.length + 1;
                    const updatedDecay = engine.updateDecay(concept, test, now);
                    const scheduled = engine.scheduleNext(updatedDecay, reviewedCount, now);
                    scheduled.state = engine.classify(scheduled, [...allTests, test]);
                    await storage.updateConcept(scheduled);
                    unsaved = false;
                    window.location.href = `result.html?id=${encodeURIComponent(id)}&test=${encodeURIComponent(test.id)}`;
                } catch (error) {
                    submit.disabled = false;
                    submit.textContent = 'Submit recall';
                    showToast(storageErrorMessage(error), 'error');
                }
            });

            document.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', event => {
                    if (!unsaved) return;
                    event.preventDefault();
                    openConfirmDialog({
                        title: 'Leave this recall?',
                        description: 'Your unsaved recall will be discarded.',
                        acceptLabel: 'Leave',
                        onAccept: () => { window.location.href = link.href; }
                    });
                });
            });
            window.addEventListener('beforeunload', event => {
                if (!unsaved) return;
                event.preventDefault();
                event.returnValue = '';
            });
        } catch (error) {
            content.hidden = false;
            empty.hidden = true;
            content.innerHTML = errorMarkup(storageErrorMessage(error));
            showToast(storageErrorMessage(error), 'error');
        }
    }

    function openConfirmDialog(options) {
        const dialog = openDialog(
            options.title,
            options.description,
            `<div class="mt-5 flex justify-end gap-2">
                <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
                <button type="button" data-confirm-accept class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">${options.acceptLabel || 'Confirm'}</button>
            </div>`
        );
        dialog.querySelector('[data-confirm-accept]').addEventListener('click', () => {
            closeDialog(dialog);
            if (typeof options.onAccept === 'function') options.onAccept();
        });
    }

    async function loadResultPage() {
        const params = new URLSearchParams(window.location.search);
        const testId = params.get('test');
        const conceptId = params.get('id');
        const content = document.querySelector('[data-result-content]');
        const empty = document.querySelector('[data-result-empty]');
        if (!content || !empty) return;
        if (!testId || !conceptId) {
            content.hidden = true;
            empty.hidden = false;
            return;
        }
        content.hidden = false;
        empty.hidden = true;
        content.innerHTML = loadingMarkup('Loading result…');
        try {
            const [concept, tests] = await Promise.all([
                globalThis.MemoryDecayStorage.getConcept(conceptId),
                globalThis.MemoryDecayStorage.listTests(conceptId)
            ]);
            const test = tests.find(item => item.id === testId);
            if (!concept || !test) {
                content.hidden = true;
                empty.hidden = false;
                return;
            }
            const engine = globalThis.MemoryDecayEngine;
            const state = engine.classify(concept, tests);
            const stateClass = state === 'stable'
                ? 'bg-[#dfeee1] text-[#42624a]'
                : state === 'at-risk'
                    ? 'bg-[#f4dfdc] text-[#87554e]'
                    : state === 'reinforcement-needed'
                        ? 'bg-[#f5ead5] text-[#82633b]'
                        : 'bg-[#edf0eb] text-muted';
            content.innerHTML = `
                <section class="rounded-2xl border border-line bg-white p-6">
                    <p class="text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a928c]">Recall result</p>
                    <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
                        <div><h1 class="font-display text-4xl">${test.score}% recall</h1><p class="mt-2 text-sm text-muted">${escapeHtml(concept.title)}</p></div>
                        <span class="rounded-full px-3 py-1.5 text-xs font-semibold ${stateClass}">${escapeHtml(state.replaceAll('-', ' '))}</span>
                    </div>
                    <div class="mt-6 h-[7px] overflow-hidden rounded-full bg-[#edf0eb]"><div class="h-full rounded-full bg-sage" style="width:${test.score}%"></div></div>
                    <div class="mt-6 grid gap-3 rounded-xl bg-[#f7f8f4] p-4 text-sm sm:grid-cols-2">
                        <div><span class="block text-muted">Score</span><strong class="mt-1 block">${test.score}%</strong></div>
                        <div><span class="block text-muted">Next review</span><strong class="mt-1 block">${escapeHtml(engine.relativeDueLabel(concept.nextReviewAt, Date.now()))}</strong></div>
                    </div>
                    <div class="mt-6 flex flex-wrap justify-end gap-2"><a href="concept.html?id=${encodeURIComponent(concept.id)}" class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium">View concept</a><a href="../../index.html" class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Dashboard</a></div>
                </section>`;
        } catch (error) {
            content.hidden = false;
            empty.hidden = true;
            content.innerHTML = errorMarkup(storageErrorMessage(error));
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
        if (document.body.dataset.page === 'recall') loadRecallPage();
        if (document.body.dataset.page === 'result') loadResultPage();
    });

    let crossTabPromptShown = false;
    function showReloadPrompt(message) {
        if (crossTabPromptShown) return;
        crossTabPromptShown = true;
        showToast(message, 'error');
        openConfirmDialog({
            title: 'Reload required',
            description: message,
            acceptLabel: 'Reload',
            onAccept: () => window.location.reload()
        });
    }
    if (globalThis.MemoryDecayStorage) {
        globalThis.MemoryDecayStorage.onVersionChange(() => {
            showReloadPrompt('Another tab changed the database schema. Reload to continue safely.');
        });
        globalThis.MemoryDecayStorage.onUpgradeBlocked(() => {
            showReloadPrompt('A database upgrade is blocked by another tab. Close older tabs and reload.');
        });
        if ('BroadcastChannel' in globalThis) {
            const channel = new BroadcastChannel('memory-decay-data');
            let broadcasting = false;
            channel.addEventListener('message', event => {
                if (event.data !== 'changed') return;
                broadcasting = true;
                if (document.body.dataset.active === 'dashboard') loadDashboardPage();
                if (document.body.dataset.page === 'concepts') loadConceptsPage();
                if (document.body.dataset.page === 'concept') loadConceptDetail();
                if (document.body.dataset.page === 'recall') loadRecallPage();
                if (document.body.dataset.page === 'result') loadResultPage();
                queueMicrotask(() => { broadcasting = false; });
            });
            window.addEventListener('memory-decay-data-changed', () => {
                if (broadcasting) return;
                channel.postMessage('changed');
            });
        }
    }

    const page = document.body.dataset.page;
    if (document.body.dataset.active === 'dashboard') loadDashboardPage();
    if (page === 'concepts') loadConceptsPage();
    if (page === 'concept') loadConceptDetail();
    if (page === 'recall') loadRecallPage();
    if (page === 'result') loadResultPage();
    if (page === 'recall') loadRecallPage();
    if (page === 'result') loadResultPage();
    if (page === 'settings') {
        const settingsCard = document.querySelector('main');
        if (settingsCard) {
            settingsCard.insertAdjacentHTML('beforeend', `
                <section class="mt-4 max-w-2xl rounded-2xl border border-line bg-white p-5">
                    <h2 class="font-display text-xl">Data</h2>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button type="button" data-export-data class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Export JSON</button>
                        <button type="button" data-import-data class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Import JSON</button>
                        <button type="button" data-reset-data class="rounded-[10px] border border-[#e2b8b1] bg-white px-4 py-2.5 text-sm font-medium text-[#87554e]">Reset all data</button>
                    </div>
                    <p data-persistence-status class="mt-4 text-sm text-muted" aria-live="polite">Checking storage persistence…</p>
                </section>
                <input type="file" data-import-file accept=".json,application/json" hidden />`);

            const versionTarget = document.querySelector('[data-app-version]');
            if (versionTarget) versionTarget.textContent = __APP_VERSION__;

            const persistenceStatus = document.querySelector('[data-persistence-status]');
            globalThis.MemoryDecayStorage.persistStorage()
                .then(result => {
                    persistenceStatus.textContent = result.supported
                        ? result.persisted
                            ? 'Persistent storage is enabled.'
                            : 'Persistent storage was not granted. Browser data may be cleared under pressure.'
                        : 'Persistent storage is not supported by this browser.';
                })
                .catch(error => {
                    persistenceStatus.textContent = storageErrorMessage(error);
                });

            document.querySelector('[data-export-data]').addEventListener('click', async () => {
                try {
                    const json = await globalThis.MemoryDecayStorage.exportAll();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `memory-decay-${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.append(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                    showToast('Workspace exported.');
                } catch (error) {
                    showToast(storageErrorMessage(error), 'error');
                }
            });

            const fileInput = document.querySelector('[data-import-file]');
            document.querySelector('[data-import-data]').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files[0];
                if (!file) return;
                if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
                    showToast('Choose a valid JSON export file.', 'error');
                    fileInput.value = '';
                    return;
                }
                try {
                    const text = await file.text();
                    JSON.parse(text);
                    openConfirmDialog({
                        title: 'Import workspace?',
                        description: 'Importing replaces concepts, tests, settings, and metadata in this browser.',
                        acceptLabel: 'Import',
                        onAccept: async () => {
                            try {
                                await globalThis.MemoryDecayStorage.importAll(text);
                                showToast('Workspace imported successfully.');
                                window.dispatchEvent(new CustomEvent('memory-decay-data-changed'));
                            } catch (error) {
                                showToast(storageErrorMessage(error), 'error');
                            } finally {
                                fileInput.value = '';
                            }
                        }
                    });
                } catch (error) {
                    showToast('Import is not valid JSON.', 'error');
                    fileInput.value = '';
                }
            });

            document.querySelector('[data-reset-data]').addEventListener('click', () => {
                openConfirmDialog({
                    title: 'Reset all data?',
                    description: 'This permanently removes concepts, tests, settings, and metadata from this browser.',
                    acceptLabel: 'Reset',
                    onAccept: async () => {
                        try {
                            await globalThis.MemoryDecayStorage.resetAll();
                            showToast('Workspace reset successfully.');
                            window.dispatchEvent(new CustomEvent('memory-decay-data-changed'));
                        } catch (error) {
                            showToast(storageErrorMessage(error), 'error');
                        }
                    }
                });
            });
        }
    }

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(error => {
                showToast('Offline support could not be enabled.', 'error');
            });
        });
    }
}());
