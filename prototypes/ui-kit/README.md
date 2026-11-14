# UI library comparison

Development-only Lit prototype comparing the installed Material Web and Web Awesome components. Production has no imports or routes to this directory. Both examples use the same state logic and fictional data; no API, storage, or external assets are used.

From the frontend checkout, run `npm run prototype:ui`, then open `http://127.0.0.1:4175/prototypes/ui-kit/index.html`. Access from another computer through an SSH tunnel to port 4175. The server must bind to localhost.

## Manual comparison

1. Review both cards at desktop width and 320–390 px width.
2. Select Russian/English and light/dark using the controls above the cards.
3. Open either editor. Compare field labels, spacing, name type selection, initial focus, Tab/Shift+Tab, and focus return after closing.
4. Clear a required field and save. An inline error should appear and focus should return to the given-name field.
5. In “First attempt fails” mode, edit the name and save. During the 1.4-second delay, save and cancel are disabled; Escape and the Web Awesome close button cannot dismiss the dialog.
6. After the simulated error, the dialog and edits remain available. Retry saves and closes the dialog; the name on the card changes.
7. Reopen to confirm the updated name, then cancel an unsaved change. It should not change the card. Opening an editor resets the simulated attempt count.
8. Select successful saving mode and repeat. The first valid attempt should succeed.
9. Enter in a text field saves. Enter in the type selector keeps its normal selection behavior. Escape cancels when idle.

Each card has independent in-memory data. Reload resets both. Names, links, and notes outside the three visible fields remain present when the visible fields are merged back into the fictional person object.

This is a proof of component fit, not a replacement for the application's full name editor or a completed accessibility audit. Shared controls use native selects so neither library is favored in the comparison. Do not copy the simulated backend into production.
