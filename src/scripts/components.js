(function () {
    const root = document.body.dataset.root || '.';
    const active = document.body.dataset.active || 'dashboard';
    const page = name => `${root}/src/pages/${name}.html`;

    const header = document.getElementById('shared-header');
    if (header) {
        header.innerHTML = `
<header class="flex h-[86px] items-center justify-between border-b border-line px-[18px] sm:px-7">
    <a href="${root}/index.html" class="flex items-center gap-3 font-display text-[23px] tracking-[-.5px] sm:text-[28px]" aria-label="Memory Decay home">
        <span class="grid size-[34px] place-items-center rounded-full border-[1.5px] border-ink font-sans text-[17px]">↻</span>
        Memory Decay
    </a>
    <div class="flex gap-2.5">
        <a href="${page('notifications')}" aria-label="Notifications" class="icon-button text-[18px]">♧</a>
        <a href="${page('profile')}" aria-label="Profile" class="icon-button text-[22px]">○</a>
    </div>
</header>`;
    }

    const sidebar = document.getElementById('shared-sidebar');
    if (sidebar) {
        const linkClass = name => `nav-button ${active === name
            ? 'border-[#c8d1c6] bg-[#dfe6dd] text-sage-dark'
            : 'border-transparent text-muted hover:bg-[#ecefe9]'}`;

        sidebar.innerHTML = `
<aside class="border-b border-line bg-[#f7f6f0] px-3 py-3 sm:relative sm:h-full sm:border-b-0 sm:border-r sm:px-4 sm:py-6">
    <p class="mb-3 ml-2.5 mt-1.5 hidden text-[10px] font-bold uppercase tracking-[1.5px] text-[#8a928c] sm:block">Workspace</p>
    <nav class="grid grid-cols-3 gap-2 sm:grid-cols-1" aria-label="Workspace navigation">
        <a href="${root}/index.html" data-nav="dashboard" class="${linkClass('dashboard')}"><span>▣</span><span>Dashboard</span></a>
        <a href="${page('concepts')}" data-nav="concepts" class="${linkClass('concepts')}"><span>◈</span><span>Concepts</span></a>
        <a href="${page('settings')}" data-nav="settings" class="${linkClass('settings')}"><span>⚙</span><span>Settings</span></a>
    </nav>
    <span class="absolute bottom-6 left-[26px] hidden text-[10px] text-[#8d958f] sm:block">version: v1.0.2</span>
</aside>`;
    }

    const floating = document.getElementById('shared-floating-ui');
    if (floating) {
        floating.innerHTML = `
<a href="${page('add-concept')}" aria-label="Add concept"
    class="fixed bottom-7 right-8 z-30 grid size-[50px] place-items-center rounded-[15px] bg-sage-dark text-[25px] text-white shadow-[0_10px_24px_rgba(64,84,71,.22)] transition hover:-translate-y-0.5 hover:bg-[#35483c]">+</a>`;
    }
}());
