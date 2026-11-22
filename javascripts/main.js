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
            showToast('Storage is not available in this build.', 'error');
        });
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
    });

    const page = document.body.dataset.page;
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
