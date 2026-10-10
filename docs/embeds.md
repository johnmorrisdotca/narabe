# Board positions and replay embeds

The shared builder covers every observed attribute and native SVG drawing option, with explicit reasons for host-only state/settings/choices/clock facts, selected coordinates and callbacks. It copies all host formats using the installed package's major version.

Game selects a native variant. Grid selects board cells; fixed-size variants retain their native normalization to their own default board. Seed fixes the initial layout. Moves is a bounded JSON MoveInput array, including placement, from/to, piece cells with their colours, pass, forfeit and twist metadata. The engine's replayMoves decides legality and stops where the record cannot continue, exactly as for a native replay. Step selects a timeline position (blank means last). The controls, arrows, Home and End operate on that same timeline; it does not create a new rules implementation.

All attributes reflect to properties, with camel names lastMove and winningLine. Assigning a moves array serializes it. State is the structured current position, or null after an input error. Options accepts state (takes precedence over replay), advanced settings, moves, opening choices, clocked forfeits, native draw options and onChange(state). seek, next and previous operate the viewer. defineBoard(tagName?, registry?) is server-safe and idempotent, using a subclass for custom names.

Display size is small/medium/large (320/480/640px), with optional pixel width. Theme auto/light/dark is scoped to the board; label supplies the spoken group name and SVG title. Removing label/width restores their original host values. SVG markup comes only from the package's escaped boardSvg writer. A status politely announces the replay position. Boolean attributes recognize false/off/no/0.

Narabe-change and narabe-load carry { step, steps, state }; narabe-error carries { message }. All events bubble and compose with JSON-safe detail. Frame receivers should verify the sender's origin and frame before accepting { type, detail } messages.

The embed route validates known games, supported board counts, bounded integers, boolean aliases and the shape/size of JSON move records, ignoring malformed fields. It has noindex, a device colour-scheme, transparent margins and no document scrolling. No storage, timers, external services or runtime dependencies are added; copied imports use jsDelivr.
