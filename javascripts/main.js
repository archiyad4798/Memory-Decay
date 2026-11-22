(function () {
    let toastTimer;
    let lastDialogTrigger = null;

    function showToast(message, type = 'success') {
        let region = document.getElementById('toast-region');
        if (!region) {
            region = document.createElement('div');
            region.id = 'toast-region';
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
            region.className = 'pointer-events-none fixed bottom-7 left-1/2 z-[80] flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 flex-col items-center';
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

    function trapDialogFocus(dialog) {
        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const focusable = [...dialog.querySelectorAll(focusableSelector)].filter(element => !element.hidden);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    function closeDialog(dialog) {
        if (dialog.open) dialog.close();
        if (lastDialogTrigger && typeof lastDialogTrigger.focus === 'function') {
            lastDialogTrigger.focus();
        }
        lastDialogTrigger = null;
        dialog.remove();
    }

    function openDialog({ title, description = '', body = '', acceptLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onAccept, width = '420px', autofocus = null }) {
        const existing = document.getElementById('memory-decay-dialog');
        if (existing) existing.remove();
        lastDialogTrigger = document.activeElement;
        const dialog = document.createElement('dialog');
        dialog.id = 'memory-decay-dialog';
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('role', 'alertdialog');
        dialog.setAttribute('aria-labelledby', 'memory-decay-dialog-title');
        dialog.className = `w-[min(${width},calc(100%-32px))] rounded-[20px] border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/35`;
        dialog.innerHTML = `
<div class="p-6">
    <div class="mb-5 flex items-start justify-between gap-5">
        <div>
            <h2 id="memory-decay-dialog-title" class="font-display text-2xl">${title}</h2>
            ${description ? `<p class="mt-1 text-[13px] leading-6 text-muted">${description}</p>` : ''}
        </div>
        <button type="button" data-dialog-close class="grid size-8 place-items-center rounded-lg text-lg text-muted hover:bg-soft focus:outline-none focus:ring-4 focus:ring-sage/20" aria-label="Close">×</button>
    </div>
    ${body}
</div>`;
        document.body.append(dialog);
        trapDialogFocus(dialog);

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

        const accept = dialog.querySelector('[data-dialog-accept]');
        if (accept) {
            accept.addEventListener('click', () => {
                const accepted = onAccept ? onAccept(dialog) : true;
                if (accepted !== false) closeDialog(dialog);
            });
        }

        dialog.showModal();
        if (autofocus) {
            const field = dialog.querySelector(autofocus);
            if (field) field.focus();
        } else {
            dialog.querySelector('[data-dialog-close]').focus();
        }
        return dialog;
    }

    function openConfirm(options) {
        return openDialog({
            ...options,
            body: `
<div class="mt-5 flex justify-end gap-2">
    <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">${options.cancelLabel || 'Cancel'}</button>
    <button type="button" data-dialog-accept class="rounded-[10px] ${options.destructive ? 'border border-[#e2b8b1] bg-white text-[#87554e]' : 'bg-sage-dark text-white'} px-4 py-2.5 text-sm font-medium">${options.acceptLabel || 'Confirm'}</button>
</div>`
        });
    }

    function setInlineError(input, message) {
        if (!input) return;
        let error = input.parentElement.querySelector('[data-inline-error]');
        if (!error) {
            error = document.createElement('p');
            error.dataset.inlineError = '';
            error.className = 'mt-1 text-xs font-normal text-[#87554e]';
            input.parentElement.append(error);
        }
        error.textContent = message;
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (message) input.setAttribute('aria-describedby', error.id || '');
    }

    function initKeywordChips(root) {
        const input = root.querySelector('[data-keyword-input]');
        const chipList = root.querySelector('[data-keyword-chips]');
        const hidden = root.querySelector('[data-keyword-value]');
        if (!input || !chipList || !hidden) return;

        const keywords = [];
        function render() {
            chipList.innerHTML = '';
            keywords.forEach((keyword, index) => {
                const chip = document.createElement('span');
                chip.className = 'inline-flex items-center gap-1.5 rounded-full bg-[#edf0eb] px-3 py-1.5 text-xs';
                const text = document.createElement('span');
                text.textContent = keyword;
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.setAttribute('aria-label', `Remove ${keyword}`);
                remove.className = 'grid size-4 place-items-center rounded-full text-muted hover:bg-line hover:text-ink';
                remove.innerHTML = '<svg aria-hidden="true" viewBox="0 0 20 20" class="size-3" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5l10 10M15 5L5 15"/></svg>';
                remove.addEventListener('click', () => {
                    keywords.splice(index, 1);
                    render();
                    input.dispatchEvent(new Event('keywordchange', { bubbles: true }));
                });
                chip.append(text, remove);
                chipList.append(chip);
            });
            hidden.value = keywords.join(',');
            input.dispatchEvent(new Event('keywordchange', { bubbles: true }));
        }
        function add(raw) {
            raw.split(',').map(value => value.trim()).filter(Boolean).forEach(keyword => {
                if (!keywords.some(value => value.toLowerCase() === keyword.toLowerCase())) keywords.push(keyword);
            });
            input.value = '';
            render();
        }
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                add(input.value);
            } else if (event.key === 'Backspace' && !input.value && keywords.length) {
                keywords.pop();
                render();
            }
        });
        input.addEventListener('paste', event => {
            event.preventDefault();
            add((event.clipboardData || window.clipboardData).getData('text'));
        });
        return { add, keywords };
    }

    function openConceptForm(mode = 'add', conceptId = 'photosynthesis') {
        const sample = {
            'binary-search': { name: 'Binary Search', material: 'Find a target in sorted data by repeatedly eliminating half the remaining search space.', keywords: ['binary', 'search', 'sorted'] },
            photosynthesis: { name: 'Photosynthesis', material: 'Plants convert light energy, water, and carbon dioxide into glucose and oxygen.', keywords: ['plants', 'light', 'glucose', 'oxygen'] },
            'french-vocabulary': { name: 'French vocabulary', material: 'Recall everyday French terms for directions, food, and common conversation.', keywords: ['french', 'directions', 'food'] }
        };
        const item = sample[conceptId] || sample.photosynthesis;
        const isEdit = mode === 'edit';
        openDialog({
            title: isEdit ? 'Edit concept' : 'Add a concept',
            description: 'Create a learning item to start tracking recall.',
            width: '470px',
            autofocus: '#concept-title',
            body: `
<form data-concept-form novalidate class="grid gap-4">
    <label class="grid gap-1.5 text-xs font-bold" for="concept-title">Title
        <input id="concept-title" name="title" value="${isEdit ? item.name : ''}" placeholder="e.g. JavaScript closures" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
    </label>
    <label class="grid gap-1.5 text-xs font-bold" for="concept-material">Material
        <textarea id="concept-material" name="material" rows="5" placeholder="Describe the idea, process, or facts to recall." class="resize-none rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15">${isEdit ? item.material : ''}</textarea>
    </label>
    <div>
        <label class="grid gap-1.5 text-xs font-bold" for="concept-keyword-input">Keywords
            <input id="concept-keyword-input" data-keyword-input placeholder="Type a keyword and press Enter" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
        </label>
        <div data-keyword-chips class="mt-2 flex flex-wrap gap-2"></div>
        <input type="hidden" data-keyword-value />
        <p data-keyword-error class="mt-1 text-xs text-[#87554e]" aria-live="polite"></p>
    </div>
    <div class="mt-1 flex justify-end gap-2">
        <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
        <button type="submit" data-concept-submit ${isEdit ? '' : 'disabled'} class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">${isEdit ? 'Save changes' : 'Save concept'}</button>
    </div>
</form>`
        });

        const dialog = document.getElementById('memory-decay-dialog');
        const form = dialog.querySelector('[data-concept-form]');
        const titleInput = form.querySelector('#concept-title');
        const materialInput = form.querySelector('#concept-material');
        const keywordInput = form.querySelector('[data-keyword-input]');
        const keywordError = form.querySelector('[data-keyword-error]');
        const submit = form.querySelector('[data-concept-submit]');
        const chips = initKeywordChips(form);
        if (isEdit) chips.add(item.keywords.join(','));

        function validate(showErrors = false) {
            const titleValid = titleInput.value.trim().length >= 3;
            const materialValid = materialInput.value.trim().length >= 10;
            const keywords = form.querySelector('[data-keyword-value]').value.split(',').filter(Boolean);
            if (showErrors) {
                setInlineError(titleInput, titleValid ? '' : 'Enter a title with at least 3 characters.');
                setInlineError(materialInput, materialValid ? '' : 'Enter at least 10 characters of material.');
                keywordError.textContent = keywords.length ? '' : 'Add at least one keyword.';
            }
            submit.disabled = !(titleValid && materialValid && keywords.length);
            return titleValid && materialValid && keywords.length;
        }
        [titleInput, materialInput].forEach(input => {
            input.addEventListener('input', () => validate(false));
            input.addEventListener('blur', () => validate(true));
        });
        keywordInput.addEventListener('keywordchange', () => {
            validate(false);
            keywordError.textContent = form.querySelector('[data-keyword-value]').value ? '' : 'Add at least one keyword.';
        });
        validate(false);
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!validate(true)) {
                showToast('Please complete the required fields.', 'error');
                return;
            }
            submit.disabled = true;
            submit.textContent = 'Saving…';
            setTimeout(() => {
                closeDialog(dialog);
                showToast(isEdit ? 'Concept updated successfully.' : 'Concept added successfully.');
            }, 550);
        });
    }

    function openDeletePopup(conceptId = 'photosynthesis') {
        const names = { 'binary-search': 'Binary Search', photosynthesis: 'Photosynthesis', 'french-vocabulary': 'French vocabulary' };
        openConfirm({
            title: 'Delete concept?',
            description: `This will remove ${names[conceptId] || names.photosynthesis} and its recall history.`,
            destructive: true,
            acceptLabel: 'Delete',
            onAccept: () => showToast('Concept deleted.', 'success')
        });
    }

    function openNotificationsPopup() {
        openDialog({
            title: 'Notifications',
            description: 'Recent workspace updates',
            width: '520px',
            autofocus: '[data-panel-mark-read]',
            body: `
<div class="grid gap-3">
    <div data-panel-notification data-read="false" class="rounded-xl border border-line bg-white p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-semibold">Photosynthesis is ready for review</p><p class="mt-1 text-xs text-muted">Your next recall check is available today.</p></div><span data-panel-dot class="mt-1 size-2 shrink-0 rounded-full bg-sage"></span></div></div>
    <div data-panel-notification data-read="false" class="rounded-xl border border-line bg-white p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-semibold">French vocabulary needs reinforcement</p><p class="mt-1 text-xs text-muted">A scheduled recall check is waiting.</p></div><span data-panel-dot class="mt-1 size-2 shrink-0 rounded-full bg-sage"></span></div></div>
</div>
<div class="mt-5 flex flex-wrap justify-between gap-2">
    <button type="button" data-panel-mark-read class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Mark all read</button>
    <a href="${rootPath('notifications')}" class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">View all notifications</a>
</div>`
        });
        const dialog = document.getElementById('memory-decay-dialog');
        dialog.querySelector('[data-panel-mark-read]').addEventListener('click', () => {
            dialog.querySelectorAll('[data-panel-notification]').forEach(item => {
                item.dataset.read = 'true';
                item.querySelector('[data-panel-dot]').hidden = true;
            });
            showToast('All notifications marked read.');
        });
    }

    function openProfilePopup() {
        openDialog({
            title: 'Edit profile',
            description: 'Update the name shown in this workspace.',
            width: '470px',
            autofocus: '#profile-popup-name',
            body: `
<form data-profile-popup-form novalidate class="grid gap-4">
    <label class="grid gap-1.5 text-xs font-bold" for="profile-popup-name">Display name
        <input id="profile-popup-name" name="name" value="Memory learner" class="rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sage focus:ring-4 focus:ring-sage/15" />
    </label>
    <div class="flex justify-end gap-2">
        <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
        <button type="submit" data-profile-popup-submit class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white">Save name</button>
    </div>
</form>`
        });
        const dialog = document.getElementById('memory-decay-dialog');
        const form = dialog.querySelector('[data-profile-popup-form]');
        const input = form.querySelector('#profile-popup-name');
        const submit = form.querySelector('[data-profile-popup-submit]');
        function validate(showError = false) {
            const valid = input.value.trim().length >= 2;
            submit.disabled = !valid;
            if (showError) setInlineError(input, valid ? '' : 'Enter at least 2 characters.');
            return valid;
        }
        input.addEventListener('input', () => validate(false));
        input.addEventListener('blur', () => validate(true));
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!validate(true)) {
                showToast('Please enter a valid name.', 'error');
                return;
            }
            submit.disabled = true;
            submit.textContent = 'Saving…';
            setTimeout(() => {
                closeDialog(dialog);
                showToast('Profile name saved.');
            }, 550);
        });
    }

    function openImportPopup() {
        openDialog({
            title: 'Import data',
            description: 'Choose a Memory Decay JSON export.',
            width: '470px',
            autofocus: '#import-file',
            body: `
<form data-import-form novalidate class="grid gap-4">
    <label class="grid gap-1.5 text-xs font-bold" for="import-file">Workspace file
        <input id="import-file" type="file" accept=".json,application/json" class="block w-full rounded-[10px] border border-line bg-white px-3 py-3 text-sm font-normal file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold" />
    </label>
    <p data-import-error class="text-xs text-[#87554e]" aria-live="polite"></p>
    <div class="flex justify-end gap-2">
        <button type="button" data-dialog-close class="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-soft">Cancel</button>
        <button type="submit" data-import-submit disabled class="rounded-[10px] bg-sage-dark px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Import</button>
    </div>
</form>`
        });
        const dialog = document.getElementById('memory-decay-dialog');
        const form = dialog.querySelector('[data-import-form]');
        const fileInput = form.querySelector('#import-file');
        const submit = form.querySelector('[data-import-submit]');
        const error = form.querySelector('[data-import-error]');
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            const valid = file && (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json');
            submit.disabled = !valid;
            error.textContent = valid ? '' : file ? 'Choose a valid .json export file.' : '';
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            const file = fileInput.files[0];
            if (!file || (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json')) {
                error.textContent = 'Choose a valid .json export file.';
                showToast('Import validation failed.', 'error');
                return;
            }
            submit.disabled = true;
            submit.textContent = 'Validating…';
            setTimeout(() => {
                closeDialog(dialog);
                showToast('Workspace import validated.'); // TODO: replace with real import logic.
            }, 550);
        });
    }

    function openExportPopup() {
        openConfirm({
            title: 'Export workspace?',
            description: 'Prepare a JSON copy of concepts and recall history.',
            acceptLabel: 'Export',
            onAccept: () => showToast('Workspace export prepared.') // TODO: replace with real export logic.
        });
    }

    const root = document.body.dataset.root || '.';
    const active = document.body.dataset.active || 'dashboard';
    function rootPath(name) {
        return name ? `${root}/src/pages/${name}.html` : `${root}/index.html`;
    }

    const header = document.getElementById('shared-header');
    if (header) {
        header.innerHTML = `
<header class="flex h-[86px] items-center justify-between border-b border-line px-[18px] sm:px-7">
    <a href="${rootPath()}" class="flex items-center gap-3 font-display text-[23px] tracking-[-.5px] sm:text-[28px]" aria-label="Memory Decay home">
        <span class="grid size-[34px] place-items-center rounded-full border-[1.5px] border-ink font-sans">
            <svg aria-hidden="true" viewBox="0 0 24 24" class="size-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 10-2.34 5.66"/><path d="M20 4v7h-7"/></svg>
        </span>
        Memory Decay
    </a>
    <div class="flex gap-2.5">
        <button type="button" data-popup="notifications" aria-label="Notifications" class="icon-button ${active === 'notifications' ? 'bg-[#dfe6dd] text-sage-dark' : ''}">
            <svg aria-hidden="true" viewBox="0 0 24 24" class="size-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
        </button>
        <button type="button" data-popup="profile" aria-label="Edit profile" class="icon-button ${active === 'profile' ? 'bg-[#dfe6dd] text-sage-dark' : ''}">
            <svg aria-hidden="true" viewBox="0 0 24 24" class="size-[20px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>
        </button>
    </div>
</header>`;
    }

    const sidebar = document.getElementById('shared-sidebar');
    if (sidebar) {
        const navClass = name => `nav-button ${active === name
            ? 'border-[#c8d1c6] bg-[#dfe6dd] text-sage-dark'
            : 'border-transparent text-muted hover:bg-[#ecefe9]'}`;
        sidebar.innerHTML = `
<aside class="border-b border-line bg-[#f7f6f0] px-3 py-3 sm:relative sm:h-full sm:border-b-0 sm:border-r sm:px-4 sm:py-6">
    <p class="mb-3 ml-2.5 mt-1.5 hidden text-[10px] font-bold uppercase tracking-[1.5px] text-[#8a928c] sm:block">Workspace</p>
    <nav class="grid grid-cols-3 gap-2 sm:grid-cols-1" aria-label="Workspace navigation">
        <a href="${rootPath()}" ${active === 'dashboard' ? 'aria-current="page"' : ''} class="${navClass('dashboard')}"><svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 8h14M8 8v9"/></svg><span>Dashboard</span></a>
        <a href="${rootPath('concepts')}" ${active === 'concepts' ? 'aria-current="page"' : ''} class="${navClass('concepts')}"><svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 3v14M3 10h14"/></svg><span>Concepts</span></a>
        <a href="${rootPath('settings')}" ${active === 'settings' ? 'aria-current="page"' : ''} class="${navClass('settings')}"><svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.35 4.35l2.12 2.12M13.53 13.53l2.12 2.12M15.65 4.35l-2.12 2.12M6.47 13.53l-2.12 2.12"/></svg><span>Settings</span></a>
    </nav>
    <span class="absolute bottom-6 left-[26px] hidden text-[10px] text-[#8d958f] sm:block">version: v1.0.2</span>
</aside>`;
    }

    const floating = document.getElementById('shared-floating-ui');
    if (floating) {
        floating.innerHTML = `<button type="button" data-popup="add" aria-label="Add concept" class="fixed bottom-7 right-8 z-30 grid size-[50px] place-items-center rounded-[15px] bg-sage-dark text-[25px] text-white shadow-[0_10px_24px_rgba(64,84,71,.22)] transition hover:-translate-y-0.5 hover:bg-[#35483c]">+</button>`;
    }

    const page = document.body.dataset.page;

    if (page === 'concepts') {
        const cards = [...document.querySelectorAll('[data-concept-card]')];
        const search = document.querySelector('[data-concept-search]');
        const filter = document.querySelector('[data-concept-filter]');
        const sort = document.querySelector('[data-concept-sort]');
        const list = document.querySelector('[data-concept-list]');
        const empty = document.querySelector('[data-concept-empty]');

        function applyConceptFilters() {
            const term = search.value.trim().toLowerCase();
            const state = filter.value;
            let visible = cards.filter(card =>
                card.textContent.toLowerCase().includes(term) &&
                (state === 'all' || card.dataset.state === state)
            );
            if (sort.value === 'lowest') visible.sort((a, b) => Number(a.dataset.score) - Number(b.dataset.score));
            if (sort.value === 'due') visible.sort((a, b) => Number(a.dataset.due) - Number(b.dataset.due));
            if (sort.value === 'newest') visible.sort((a, b) => Number(b.dataset.newest) - Number(a.dataset.newest));
            cards.forEach(card => card.hidden = true);
            visible.forEach(card => list.append(card));
            visible.forEach(card => card.hidden = false);
            empty.hidden = visible.length !== 0;
        }
        [search, filter, sort].forEach(control => {
            control.addEventListener(control === sort || control === filter ? 'change' : 'input', applyConceptFilters);
        });
        applyConceptFilters();
    }

    if (page === 'recall') {
        const params = new URLSearchParams(window.location.search);
        const content = document.querySelector('[data-recall-content]');
        const empty = document.querySelector('[data-recall-empty]');
        if (!params.get('concept')) {
            content.hidden = true;
            empty.hidden = false;
        } else {
            content.hidden = false;
            empty.hidden = true;
        }

        const material = document.querySelector('[data-material-state]');
        const answer = document.querySelector('[data-answer-state]');
        const lock = document.querySelector('[data-lock-start]');
        const textarea = document.querySelector('#answer');
        const count = document.querySelector('[data-character-count]');
        const submit = document.querySelector('[data-submit-recall]');
        let unsaved = false;

        if (lock) lock.addEventListener('click', () => {
            material.hidden = true;
            answer.hidden = false;
            textarea.focus();
            showToast('Material locked. Recall in your own words.');
        });
        if (textarea) {
            const updateCount = () => {
                const length = textarea.value.length;
                count.textContent = `${length} character${length === 1 ? '' : 's'}`;
                submit.disabled = length === 0;
                unsaved = length > 0;
            };
            textarea.addEventListener('input', updateCount);
            updateCount();
        }
        if (submit) submit.addEventListener('click', event => {
            if (submit.disabled) return;
            event.preventDefault();
            submit.disabled = true;
            submit.textContent = 'Submitting…';
            unsaved = false;
            setTimeout(() => {
                window.location.href = `result.html?concept=${encodeURIComponent(params.get('concept') || 'photosynthesis')}`;
            }, 550);
        });

        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', event => {
                if (!unsaved || link.href === window.location.href) return;
                event.preventDefault();
                openConfirm({
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
    }

    if (page === 'result') {
        const params = new URLSearchParams(window.location.search);
        const content = document.querySelector('[data-result-content]');
        const empty = document.querySelector('[data-result-empty]');
        if (!params.get('concept')) {
            content.hidden = true;
            empty.hidden = false;
        } else {
            content.hidden = false;
            empty.hidden = true;
        }
        document.querySelectorAll('[data-result-action]').forEach(button => {
            button.addEventListener('click', () => showToast('Opening dashboard.'));
        });
    }

    if (page === 'settings') {
        document.querySelectorAll('[data-demo-toggle]').forEach(toggle => {
            toggle.addEventListener('change', () => showToast(toggle.checked ? 'Demo mode enabled.' : 'Demo mode disabled.'));
        });
        const exportButton = document.querySelector('[data-export]');
        const importButton = document.querySelector('[data-import]');
        if (exportButton) exportButton.addEventListener('click', openExportPopup);
        if (importButton) importButton.addEventListener('click', openImportPopup);
        const reset = document.querySelector('[data-reset]');
        if (reset) reset.addEventListener('click', () => openConfirm({
            title: 'Reset workspace?',
            description: 'This will remove concepts and recall history.',
            destructive: true,
            acceptLabel: 'Reset',
            onAccept: () => showToast('Reset confirmed. TODO: replace with real reset logic.')
        }));
    }

    if (page === 'notifications') {
        const notifications = [...document.querySelectorAll('[data-notification]')];
        const markAll = document.querySelector('[data-mark-all]');
        notifications.forEach(button => {
            button.addEventListener('click', () => {
                const nowRead = button.dataset.read !== 'true';
                button.dataset.read = nowRead ? 'true' : 'false';
                button.setAttribute('aria-pressed', String(!nowRead));
                button.querySelector('[data-read-dot]').hidden = nowRead;
                button.querySelector('[data-read-label]').textContent = nowRead ? 'Read' : 'Unread';
                showToast(nowRead ? 'Notification marked read.' : 'Notification marked unread.');
            });
        });
        if (markAll) markAll.addEventListener('click', () => {
            notifications.forEach(button => {
                button.dataset.read = 'true';
                button.setAttribute('aria-pressed', 'true');
                button.querySelector('[data-read-dot]').hidden = true;
                button.querySelector('[data-read-label]').textContent = 'Read';
            });
            showToast('All notifications marked read.');
        });
    }

    if (page === 'profile') {
        const form = document.querySelector('[data-profile-form]');
        if (form) {
            const input = form.querySelector('#profile-name');
            const submit = form.querySelector('[data-save-profile]');
            input.addEventListener('input', () => { submit.disabled = input.value.trim().length < 2; });
            form.addEventListener('submit', event => {
                event.preventDefault();
                if (input.value.trim().length < 2) {
                    setInlineError(input, 'Enter at least 2 characters.');
                    showToast('Please enter a valid name.', 'error');
                    return;
                }
                setInlineError(input, '');
                showToast('Profile name saved.');
            });
        }
    }

    document.addEventListener('click', event => {
        const control = event.target.closest('[data-popup]');
        if (!control) return;
        const popup = control.dataset.popup;
        if (popup === 'add') openConceptForm('add');
        if (popup === 'edit') openConceptForm('edit', control.dataset.concept);
        if (popup === 'delete') openDeletePopup(control.dataset.concept);
        if (popup === 'notifications') openNotificationsPopup();
        if (popup === 'profile') openProfilePopup();
    });
}());
