const MemoryDecayStorage = (() => {
    'use strict';

    const DB_NAME = 'memory-decay';
    const DB_VERSION = 1;
    const STORES = Object.freeze({
        concepts: 'concepts',
        tests: 'tests',
        settings: 'settings',
        meta: 'meta'
    });

    let connection = null;
    let connectionPromise = null;
    const versionChangeListeners = new Set();
    const upgradeBlockedListeners = new Set();

    class StorageError extends Error {
        constructor(code, message, cause) {
            super(message);
            this.name = 'StorageError';
            this.code = code;
            if (cause) this.cause = cause;
        }
    }

    function unavailable(message, cause) {
        return new StorageError('STORAGE_UNAVAILABLE', message, cause);
    }

    function blocked(message) {
        return new StorageError('UPGRADE_BLOCKED', message);
    }

    function quota(cause) {
        return new StorageError('QUOTA_EXCEEDED', 'Browser storage is full or the write could not be completed.', cause);
    }

    function validation(message, field) {
        const error = new StorageError('INVALID_IMPORT', message);
        if (field) error.field = field;
        return error;
    }

    function requestPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                const error = request.error;
                if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    reject(quota(error));
                } else {
                    reject(new StorageError('DATABASE_REQUEST_FAILED', error?.message || 'The IndexedDB request failed.', error));
                }
            };
        });
    }

    function transactionPromise(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => {
                const error = transaction.error;
                if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    reject(quota(error));
                } else {
                    reject(new StorageError('DATABASE_TRANSACTION_FAILED', error?.message || 'The IndexedDB transaction failed.', error));
                }
            };
            transaction.onerror = () => {
                const error = transaction.error;
                if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    reject(quota(error));
                } else {
                    reject(new StorageError('DATABASE_TRANSACTION_FAILED', error?.message || 'The IndexedDB transaction failed.', error));
                }
            };
        });
    }

    function notifyVersionChange() {
        for (const listener of versionChangeListeners) {
            listener({ dbName: DB_NAME, version: DB_VERSION });
        }
    }

    function notifyUpgradeBlocked(error) {
        for (const listener of upgradeBlockedListeners) listener(error);
    }

    function openDatabase() {
        if (connection) return Promise.resolve(connection);
        if (connectionPromise) return connectionPromise;

        connectionPromise = new Promise((resolve, reject) => {
            let indexedDB;
            try {
                indexedDB = globalThis.indexedDB;
            } catch (error) {
                reject(unavailable('IndexedDB is unavailable in this browser.', error));
                return;
            }
            if (!indexedDB) {
                reject(unavailable('IndexedDB is unavailable in this browser.'));
                return;
            }

            let request;
            try {
                request = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (error) {
                reject(unavailable('IndexedDB could not be opened.', error));
                return;
            }

            request.onupgradeneeded = event => {
                const database = request.result;
                const oldVersion = event.oldVersion || 0;

                if (oldVersion < 1) {
                    if (!database.objectStoreNames.contains(STORES.concepts)) {
                        database.createObjectStore(STORES.concepts, { keyPath: 'id' });
                    }
                    if (!database.objectStoreNames.contains(STORES.tests)) {
                        const testStore = database.createObjectStore(STORES.tests, { keyPath: 'id' });
                        testStore.createIndex('conceptId', 'conceptId', { unique: false });
                        testStore.createIndex('at', 'at', { unique: false });
                    }
                    if (!database.objectStoreNames.contains(STORES.settings)) {
                        database.createObjectStore(STORES.settings, { keyPath: 'key' });
                    }
                    if (!database.objectStoreNames.contains(STORES.meta)) {
                        database.createObjectStore(STORES.meta, { keyPath: 'key' });
                    }
                }

                if (database.version > DB_VERSION) {
                    request.transaction.abort();
                }
            };

            request.onblocked = () => {
                const error = blocked('A database upgrade was blocked by another open Memory Decay tab. Close older tabs and reload.');
                notifyUpgradeBlocked(error);
                reject(error);
            };
            request.onerror = () => {
                const error = request.error;
                if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    reject(quota(error));
                } else {
                    reject(unavailable(error?.message || 'IndexedDB could not be opened.', error));
                }
            };
            request.onsuccess = () => {
                connection = request.result;
                connection.onversionchange = () => {
                    connection.close();
                    connection = null;
                    notifyVersionChange();
                };
                resolve(connection);
            };
        }).finally(() => {
            connectionPromise = null;
        });

        return connectionPromise;
    }

    async function withStore(storeName, mode, operation) {
        const database = await openDatabase();
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const result = await operation(store);
        await transactionPromise(transaction);
        return result;
    }

    async function withStores(storeNames, mode, operation) {
        const database = await openDatabase();
        const transaction = database.transaction(storeNames, mode);
        const result = await operation(transaction);
        await transactionPromise(transaction);
        return result;
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function validateString(value, field, allowEmpty = false) {
        if (typeof value !== 'string') throw validation(`${field} must be a string.`, field);
        if (!allowEmpty && value.trim().length === 0) throw validation(`${field} must not be empty.`, field);
    }

    function validateConcept(concept) {
        if (!isObject(concept)) throw validation('Concept must be an object.', 'concept');
        validateString(concept.id, 'concept.id');
        validateString(concept.title, 'concept.title');
        validateString(concept.raw, 'concept.raw', true);
        if (!Array.isArray(concept.keywords) || concept.keywords.some(keyword => typeof keyword !== 'string')) {
            throw validation('concept.keywords must be an array of strings.', 'concept.keywords');
        }
        if (!isFiniteNumber(concept.createdAt)) throw validation('concept.createdAt must be a number.', 'concept.createdAt');
        if (!isFiniteNumber(concept.decayRate)) throw validation('concept.decayRate must be a number.', 'concept.decayRate');
        if (!isFiniteNumber(concept.nextReviewAt)) throw validation('concept.nextReviewAt must be a number.', 'concept.nextReviewAt');
        validateString(concept.state, 'concept.state');
        return {
            id: concept.id,
            title: concept.title.trim(),
            raw: concept.raw,
            keywords: concept.keywords.map(keyword => keyword.trim()).filter(Boolean),
            createdAt: concept.createdAt,
            decayRate: concept.decayRate,
            nextReviewAt: concept.nextReviewAt,
            state: concept.state
        };
    }

    function validateTest(test) {
        if (!isObject(test)) throw validation('Test must be an object.', 'test');
        validateString(test.id, 'test.id');
        validateString(test.conceptId, 'test.conceptId');
        if (!isFiniteNumber(test.at)) throw validation('test.at must be a number.', 'test.at');
        if (!isFiniteNumber(test.score) || test.score < 0 || test.score > 100) {
            throw validation('test.score must be a number from 0 to 100.', 'test.score');
        }
        validateString(test.answer, 'test.answer', true);
        return { id: test.id, conceptId: test.conceptId, at: test.at, score: test.score, answer: test.answer };
    }

    function validateSettings(settings) {
        if (!Array.isArray(settings)) throw validation('settings must be an array.', 'settings');
        return settings.map(setting => {
            if (!isObject(setting)) throw validation('Setting must be an object.', 'setting');
            validateString(setting.key, 'setting.key');
            if (!Object.prototype.hasOwnProperty.call(setting, 'value')) {
                throw validation('Setting must include value.', 'setting.value');
            }
            return { key: setting.key, value: setting.value };
        });
    }

    function validateMeta(meta) {
        if (!Array.isArray(meta)) throw validation('meta must be an array.', 'meta');
        return meta.map(item => {
            if (!isObject(item)) throw validation('Meta entry must be an object.', 'meta');
            validateString(item.key, 'meta.key');
            if (!Object.prototype.hasOwnProperty.call(item, 'value')) {
                throw validation('Meta entry must include value.', 'meta.value');
            }
            return { key: item.key, value: item.value };
        });
    }

    function createId(prefix) {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
            return `${prefix}-${globalThis.crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    async function addConcept(input) {
        if (!isObject(input)) throw validation('Concept must be an object.', 'concept');
        const now = isFiniteNumber(input.createdAt) ? input.createdAt : Date.now();
        const concept = validateConcept({
            id: input.id || createId('concept'),
            title: input.title,
            raw: typeof input.raw === 'string' ? input.raw : '',
            keywords: Array.isArray(input.keywords) ? input.keywords : [],
            createdAt: now,
            decayRate: isFiniteNumber(input.decayRate) ? input.decayRate : 0.3,
            nextReviewAt: isFiniteNumber(input.nextReviewAt) ? input.nextReviewAt : now,
            state: typeof input.state === 'string' ? input.state : 'new'
        });
        await withStore(STORES.concepts, 'readwrite', store => requestPromise(store.put(concept)));
        return concept;
    }

    async function updateConcept(concept) {
        const validated = validateConcept(concept);
        await withStore(STORES.concepts, 'readwrite', store => requestPromise(store.put(validated)));
        return validated;
    }

    async function deleteConcept(id) {
        validateString(id, 'concept.id');
        await withStores([STORES.concepts, STORES.tests], 'readwrite', async transaction => {
            const conceptStore = transaction.objectStore(STORES.concepts);
            const testStore = transaction.objectStore(STORES.tests);
            await requestPromise(conceptStore.delete(id));
            const index = testStore.index('conceptId');
            const keys = await requestPromise(index.getAllKeys(id));
            await Promise.all(keys.map(key => requestPromise(testStore.delete(key))));
        });
    }

    async function getConcept(id) {
        validateString(id, 'concept.id');
        return withStore(STORES.concepts, 'readonly', store => requestPromise(store.get(id)));
    }

    async function listConcepts() {
        const concepts = await withStore(STORES.concepts, 'readonly', store => requestPromise(store.getAll()));
        return concepts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    async function addTest(input) {
        if (!isObject(input)) throw validation('Test must be an object.', 'test');
        const test = validateTest({
            id: input.id || createId('test'),
            conceptId: input.conceptId,
            at: isFiniteNumber(input.at) ? input.at : Date.now(),
            score: input.score,
            answer: typeof input.answer === 'string' ? input.answer : ''
        });
        await withStore(STORES.tests, 'readwrite', store => requestPromise(store.put(test)));
        return test;
    }

    async function listTests(conceptId) {
        if (conceptId !== undefined) {
            validateString(conceptId, 'conceptId');
            return withStore(STORES.tests, 'readonly', store =>
                requestPromise(store.index('conceptId').getAll(conceptId))
            );
        }
        const tests = await withStore(STORES.tests, 'readonly', store => requestPromise(store.getAll()));
        return tests.sort((a, b) => (a.at || 0) - (b.at || 0));
    }

    async function getSetting(key) {
        validateString(key, 'setting.key');
        return withStore(STORES.settings, 'readonly', store => requestPromise(store.get(key)));
    }

    async function setSetting(key, value) {
        validateString(key, 'setting.key');
        const setting = { key, value };
        await withStore(STORES.settings, 'readwrite', store => requestPromise(store.put(setting)));
        return setting;
    }

    async function exportAll() {
        const database = await openDatabase();
        const transaction = database.transaction(
            [STORES.concepts, STORES.tests, STORES.settings, STORES.meta],
            'readonly'
        );
        const stores = {};
        for (const name of [STORES.concepts, STORES.tests, STORES.settings, STORES.meta]) {
            const store = transaction.objectStore(name);
            stores[name] = await requestPromise(store.getAll());
        }
        await transactionPromise(transaction);
        return JSON.stringify({
            schemaVersion: DB_VERSION,
            exportedAt: Date.now(),
            concepts: stores.concepts,
            tests: stores.tests,
            settings: stores.settings,
            meta: stores.meta
        }, null, 2);
    }

    function parseImportJson(json) {
        let parsed;
        if (typeof json !== 'string') throw validation('Import data must be a JSON string.', 'json');
        try {
            parsed = JSON.parse(json);
        } catch (error) {
            throw validation('Import data is not valid JSON.', 'json');
        }
        if (!isObject(parsed)) throw validation('Import data must be an object.', 'json');
        if (parsed.schemaVersion !== DB_VERSION) {
            throw validation(`Unsupported schemaVersion. Expected ${DB_VERSION}.`, 'schemaVersion');
        }
        if (!Array.isArray(parsed.concepts)) throw validation('concepts must be an array.', 'concepts');
        if (!Array.isArray(parsed.tests)) throw validation('tests must be an array.', 'tests');
        if (!Array.isArray(parsed.settings)) throw validation('settings must be an array.', 'settings');
        if (!Array.isArray(parsed.meta)) throw validation('meta must be an array.', 'meta');
        const concepts = parsed.concepts.map(validateConcept);
        const tests = parsed.tests.map(validateTest);
        const conceptIds = new Set(concepts.map(concept => concept.id));
        for (const test of tests) {
            if (!conceptIds.has(test.conceptId)) {
                throw validation(`Test references missing concept "${test.conceptId}".`, 'tests.conceptId');
            }
        }
        return {
            concepts,
            tests,
            settings: validateSettings(parsed.settings),
            meta: validateMeta(parsed.meta)
        };
    }

    async function importAll(json) {
        const data = parseImportJson(json);
        await withStores(
            [STORES.concepts, STORES.tests, STORES.settings, STORES.meta],
            'readwrite',
            async transaction => {
                await Promise.all([
                    requestPromise(transaction.objectStore(STORES.concepts).clear()),
                    requestPromise(transaction.objectStore(STORES.tests).clear()),
                    requestPromise(transaction.objectStore(STORES.settings).clear()),
                    requestPromise(transaction.objectStore(STORES.meta).clear())
                ]);
                await Promise.all([
                    ...data.concepts.map(concept => requestPromise(transaction.objectStore(STORES.concepts).put(concept))),
                    ...data.tests.map(test => requestPromise(transaction.objectStore(STORES.tests).put(test))),
                    ...data.settings.map(setting => requestPromise(transaction.objectStore(STORES.settings).put(setting))),
                    ...data.meta.map(item => requestPromise(transaction.objectStore(STORES.meta).put(item)))
                ]);
            }
        );
    }

    async function resetAll() {
        await withStores(
            [STORES.concepts, STORES.tests, STORES.settings, STORES.meta],
            'readwrite',
            async transaction => {
                await Promise.all([
                    requestPromise(transaction.objectStore(STORES.concepts).clear()),
                    requestPromise(transaction.objectStore(STORES.tests).clear()),
                    requestPromise(transaction.objectStore(STORES.settings).clear()),
                    requestPromise(transaction.objectStore(STORES.meta).clear())
                ]);
            }
        );
    }

    async function persistStorage() {
        if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.persist !== 'function') {
            return { supported: false, persisted: false };
        }
        try {
            const persisted = await navigator.storage.persist();
            return { supported: true, persisted: Boolean(persisted) };
        } catch (error) {
            throw unavailable('Persistent browser storage could not be requested.', error);
        }
    }

    function onVersionChange(listener) {
        if (typeof listener !== 'function') throw new TypeError('Version-change listener must be a function.');
        versionChangeListeners.add(listener);
        return () => versionChangeListeners.delete(listener);
    }

    function onUpgradeBlocked(listener) {
        if (typeof listener !== 'function') throw new TypeError('Upgrade-blocked listener must be a function.');
        upgradeBlockedListeners.add(listener);
        return () => upgradeBlockedListeners.delete(listener);
    }

    function closeDatabase() {
        if (connection) {
            connection.close();
            connection = null;
        }
    }

    return Object.freeze({
        DB_NAME,
        DB_VERSION,
        StorageError,
        openDatabase,
        closeDatabase,
        onVersionChange,
        onUpgradeBlocked,
        persistStorage,
        addConcept,
        updateConcept,
        deleteConcept,
        getConcept,
        listConcepts,
        addTest,
        listTests,
        getSetting,
        setSetting,
        exportAll,
        importAll,
        resetAll
    });
})();

globalThis.MemoryDecayStorage = MemoryDecayStorage;