# Memory Decay Release Test Script

Run this checklist against a production build. Start the preview server with
`npm run preview` after the Vite build is available.

## 1. Fresh install

1. Open the app in a clean browser profile or clear site storage.
2. Open Dashboard.
3. Confirm the due card says "No concepts due."
4. Confirm the status values are zero.
5. Confirm the retention chart displays "No retention history."
6. Open Concepts.
7. Confirm "No concepts yet" and "Add your first concept" are visible.
8. Open Recall and Result directly.
9. Confirm each page shows its empty state and a link back to Concepts.
10. Open Settings.
11. Confirm the package version is shown under About.

## 2. Add concept

1. From Dashboard or Concepts, open "Add a concept."
2. Submit with an empty title.
3. Confirm an inline title error appears and Save remains disabled.
4. Enter a title of at least three characters.
5. Enter material of at least ten characters.
6. Enter at least one comma-separated keyword.
7. Confirm Save becomes enabled.
8. Save and confirm a success toast appears.
9. Open Concepts and confirm the concept is present.

## 3. Edit and delete concept

1. Open a concept from Concepts.
2. Choose Edit.
3. Change the title, material, and keywords.
4. Save and confirm the updated values appear.
5. Choose Delete.
6. Cancel once and confirm the concept remains.
7. Choose Delete again and confirm.
8. Confirm the concept disappears from Concepts and Dashboard.

## 4. Recall loop

### Empty answer

1. Open a concept and start recall.
2. Lock the material.
3. Leave the answer empty.
4. Confirm Submit is disabled.

### Partial answer

1. Enter only part of the concept material.
2. Confirm the character count updates.
3. Submit.
4. Confirm the result displays a 0-99 score and reinforcement state.

### Perfect answer

1. Start another recall.
2. Enter the title and material keywords accurately.
3. Submit.
4. Confirm the result displays a high score and the updated next review date.

## 5. Reload persistence

1. Add a concept and complete at least one recall.
2. Reload the page.
3. Confirm the concept, test history, score, and schedule remain.

## 6. Export, reset, and import

1. Open Settings.
2. Choose Export and save the JSON file.
3. Verify the file contains concepts, tests, settings, and meta data.
4. Choose Reset and confirm.
5. Confirm Concepts is empty and Dashboard has no history.
6. Choose Import and select the exported JSON.
7. Confirm the previous concepts and tests return.

## 7. Import validation

1. Choose an invalid text file or JSON object.
2. Confirm a clear validation error appears.
3. Confirm the existing workspace is unchanged.
4. Choose valid JSON with one missing required field.
5. Confirm a schema error identifies the invalid data.

## 8. Offline use

1. Load the app once while online.
2. Wait for the service worker to finish activating.
3. Disable the network.
4. Reload the app.
5. Confirm the app shell and visited pages remain available.

## 9. Multi-tab behavior

1. Open Memory Decay in two tabs.
2. Add or edit a concept in one tab.
3. Confirm the other tab refreshes or announces the change.
4. Reset in one tab.
5. Confirm the other tab updates without stale content.

## 10. Storage unavailable

1. Block IndexedDB or use a private mode that rejects persistent storage.
2. Open the app.
3. Confirm a clear storage error appears.
4. Confirm the app does not crash or claim data was saved.
5. Confirm retry or reload guidance is available.

## 11. Responsive and keyboard checks

1. Check 375px, 768px, and 1440px widths.
2. Confirm there is no horizontal page overflow.
3. Navigate using only the keyboard.
4. Open and close every dialog with Escape and the Close button.
5. Confirm focus is trapped in dialogs and restored to the trigger.
